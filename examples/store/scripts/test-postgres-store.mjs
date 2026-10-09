import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { neon } from "@neondatabase/serverless";

// Ignore the application's old proof URL and ambient DATABASE_URL completely.
const root = fileURLToPath(new URL("../", import.meta.url));
const envPath = new URL("../../../../fiber-latch/.env.local", import.meta.url);
const connectionString = parseEnv(readFileSync(envPath, "utf8")).DATABASE_URL;
assert(connectionString && new URL(connectionString).hostname.endsWith(".neon.tech"));
const query = neon(connectionString);
const tables = ["access_entitlements", "cart_items", "carts", "collection_products", "collections",
  "order_items", "orders", "product_images", "product_options", "product_variants", "products",
  "account", "session", "user", "verification"];
const snapshotSchema = "fiberflow_store_acceptance_preserved";
const split = (sql) => sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
const batch = (statements) => query.transaction(statements.map((s) => query.query(s)));
let installed = false;
let original;
try {
  const existing = await query.query("SELECT relname FROM pg_class JOIN pg_namespace ON pg_namespace.oid=relnamespace WHERE nspname='public' AND relkind IN ('r','v','p')");
  assert(!existing.some((r) => tables.includes(r.relname)), "Refuse to alter existing FiberFlow tables");
  const relation = await query.query("SELECT relkind FROM pg_class WHERE oid=to_regclass('public.access_receipts')");
  assert.equal(relation[0]?.relkind, "r", "Expected the fresh standalone proof table");
  original = await query.query("SELECT * FROM public.access_receipts ORDER BY jti");
  mkdirSync(new URL("../.test-data/base-schema", import.meta.url), { recursive: true });
  // Offline generation from the actual unchanged host schema; never db:push.
  const generated = spawnSync(process.execPath, ["node_modules/drizzle-kit/bin.cjs", "generate", "--dialect", "postgresql",
    "--schema", "./lib/db/schema.ts", "--out", "./.test-data/base-schema"], { cwd: root, encoding: "utf8" });
  assert.equal(generated.status, 0, "Offline schema generation failed");
  const sqlFiles = readdirSync(new URL("../.test-data/base-schema/", import.meta.url)).filter((f) => f.endsWith(".sql"));
  assert.equal(sqlFiles.length, 1, "Expected one baseline schema migration");
  const baseline = readFileSync(new URL(`../.test-data/base-schema/${sqlFiles[0]}`, import.meta.url), "utf8");
  const mapping = readFileSync(new URL("../sql/001_fiberlatch_postgres_store.sql", import.meta.url), "utf8");
  // Atomic setup. Preserve, never drop/truncate/copy the proven standalone table.
  const setup = [`CREATE SCHEMA ${snapshotSchema}`, `ALTER TABLE public.access_receipts SET SCHEMA ${snapshotSchema}`,
    ...split(baseline),
    `INSERT INTO public."user" (id,name,email) VALUES ('migration-fixture','Migration fixture','migration@example.test')`,
    `INSERT INTO public.orders (id,user_id,status,subtotal_amount,total_amount) VALUES ('00000000-0000-4000-8000-000000000001','migration-fixture','paid',1,1)`,
    `INSERT INTO public.access_entitlements (order_id,user_id,payment_ref,intent_id,resource_id,policy_id,issuer,audience,jti,grant_type,issued_at,not_before,expires_at,max_redemptions,redemption_count,exhausted)
      VALUES ('00000000-0000-4000-8000-000000000001','migration-fixture','fixture-payment','fixture-intent','fixture-resource','fixture-policy','fixture-issuer','fixture-audience','migration-fixture','multi_redemption',1,1,2,3,3,false)`];
  const authoritySnapshot = "SELECT to_jsonb(e) - 'exhausted' AS authority FROM public.access_entitlements e WHERE jti='migration-fixture'";
  const applied = await batch([...setup, authoritySnapshot, ...split(mapping), authoritySnapshot]);
  installed = true;
  assert.deepEqual(applied[setup.length], applied.at(-1), "Migration must preserve existing row authority/counter");
  assert.equal((await query.query("SELECT exhausted FROM public.access_entitlements WHERE jti='migration-fixture'"))[0].exhausted, true);
  console.log("Fresh Neon: host schema + compatibility migration applied; standalone table preserved.");
  console.log("Migration PASS: existing entitlement authority/counter preserved; stale exhausted metadata corrected.");
  const child = spawnSync(process.execPath, ["--import", "tsx", "--test", "test/private-api-neon.test.ts"], {
    cwd: root, stdio: "inherit", env: { ...process.env, DATABASE_URL: connectionString,
      TSX_TSCONFIG_PATH: "test/tsconfig.neon.json", FIBERFLOW_FRESH_STORE_ACCEPTANCE: "1" },
  });
  process.exitCode = child.status === 0 ? 0 : 1;
} catch (error) {
  const code = /^[A-Z0-9_]+$/.test(error?.code ?? "") ? error.code : "CHECK_FAILED";
  console.error(`Fresh Neon acceptance failed (${code}); raw errors withheld.`);
  process.exitCode = 1;
} finally {
  if (installed) {
    try {
      // Drop only tables created by this run, together to satisfy their internal FKs.
      await batch(["DROP VIEW public.access_receipts", `DROP TABLE ${tables.map((t) => `public."${t}"`).join(", ")}`,
        "DROP FUNCTION public.sync_access_entitlement_exhausted()",
        `ALTER TABLE ${snapshotSchema}.access_receipts SET SCHEMA public`, `DROP SCHEMA ${snapshotSchema}`]);
      assert.deepEqual(await query.query("SELECT * FROM public.access_receipts ORDER BY jti"), original);
      console.log("Cleanup PASS: FiberFlow fixtures/schema removed; standalone table and rows restored unchanged.");
    } catch {
      console.error("Cleanup failed; inspect the scoped fresh database before rerunning. Raw errors withheld.");
      process.exitCode = 1;
    }
  }
}
