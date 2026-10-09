import assert from "node:assert/strict";
import { before, test } from "node:test";
import { randomUUID, webcrypto } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { createAccessReceiptSigner, createAccessReceiptVerifier, type AccessReceiptClaims } from "@fiberlatch/access";
import { createPostgresAccessReceiptStore } from "@fiberlatch/postgres-store";
import { PRIVATE_API_PRODUCT_ID, PRIVATE_API_PRODUCT_TITLE } from "../lib/private-api-constants";

assert.equal(process.env.FIBERFLOW_FRESH_STORE_ACCEPTANCE, "1", "Run only through npm run test:postgres-store");
const query = neon(process.env.DATABASE_URL!);
let app: typeof import("../lib/private-api-access");
let bridge: typeof import("../lib/db");
let signer: Awaited<ReturnType<typeof createAccessReceiptSigner>>;
let verifier: Awaited<ReturnType<typeof createAccessReceiptVerifier>>;
const subject = `store-proof-${randomUUID()}`;

before(async () => {
  const keys = await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]) as CryptoKeyPair;
  const privateKey = { ...await webcrypto.subtle.exportKey("jwk", keys.privateKey), alg: "EdDSA", kid: "fresh-neon-proof" };
  const publicKey = { ...await webcrypto.subtle.exportKey("jwk", keys.publicKey), alg: "EdDSA", kid: "fresh-neon-proof" };
  process.env.FIBERLATCH_PRIVATE_JWK = JSON.stringify(privateKey);
  process.env.FIBERLATCH_PUBLIC_JWK = JSON.stringify(publicKey);
  process.env.FIBERLATCH_ISSUER = "https://fiberflow-store.example.test/access";
  process.env.FIBERLATCH_AUDIENCE = "fiberflow-store-private-api";
  signer = await createAccessReceiptSigner({ privateKey });
  verifier = await createAccessReceiptVerifier({ publicKeys: [publicKey], issuer: process.env.FIBERLATCH_ISSUER, audience: process.env.FIBERLATCH_AUDIENCE });
  app = await import("../lib/private-api-access");
  bridge = await import("../lib/db");
  await query.query('INSERT INTO public."user" (id,name,email) VALUES ($1,$2,$3)', [subject, "Acceptance fixture", `${subject}@example.test`]);
});

async function fixture() {
  const id = randomUUID();
  const paymentHash = `0x${randomUUID().replaceAll("-", "")}`;
  await query.query("INSERT INTO public.orders (id,user_id,status,subtotal_amount,total_amount,fiberflow_payment_hash) VALUES ($1,$2,'paid',1,1,$3)", [id, subject, paymentHash]);
  const order = { id, userId: subject, status: "paid" as const, paymentHash,
    items: [{ productId: PRIVATE_API_PRODUCT_ID, productTitle: PRIVATE_API_PRODUCT_TITLE }] };
  const issued = await app.issuePrivateApiEntitlement({ order: order as never, paymentRef: paymentHash });
  const claims = await verifier(issued.receipt);
  return { ...issued, claims, order, redeem: (token = issued.receipt, owner = subject) => app.redeemPrivateApiReceiptForOrder({ token, subject: owner }) };
}
async function state(jti: string) {
  return (await query.query("SELECT redemption_count, max_redemptions, exhausted FROM public.access_entitlements WHERE jti=$1", [jti]))[0]!;
}
function command(claims: AccessReceiptClaims) {
  return { ...claims, current_time: Math.floor(Date.now() / 1000), expected_max_redemptions: 3 };
}
const denial = (reason: string) => ({ status: "consumption_denied", phase: "consumption", reason });

test("actual issuance and concurrent duplicate delivery preserve one entitlement/JTI", async () => {
  const f = await fixture();
  const repeats = await Promise.all(Array.from({ length: 8 }, () => app.issuePrivateApiEntitlement({ order: f.order as never, paymentRef: f.order.paymentHash })));
  assert(repeats.every((r) => r.entitlement.jti === f.entitlement.jti));
  const rows = await query.query("SELECT jti,redemption_count FROM public.access_entitlements WHERE order_id=$1", [f.order.id]);
  assert.deepEqual(rows, [{ jti: f.entitlement.jti, redemption_count: 0 }]);
});
test("receipt lookup and signing preserve authority; foreign owner retrieves nothing", async () => {
  const f = await fixture();
  const found = await app.getPrivateApiEntitlementForOrder(f.order.id, subject, f.order.paymentHash);
  assert(found);
  assert.deepEqual(await verifier(await app.signPrivateApiEntitlement(found)), f.claims);
  assert.equal(await app.getPrivateApiEntitlementForOrder(f.order.id, "foreign", f.order.paymentHash), undefined);
});
test("rightful subject gets uses 1/2/3; fourth denies with count 3 and synchronized flag", async () => {
  const f = await fixture();
  for (let n = 1; n <= 3; n++) {
    assert.deepEqual(await f.redeem(), { status: "success", exhausted: n === 3 });
    assert.deepEqual(await state(f.claims.jti), { redemption_count: n, max_redemptions: 3, exhausted: n === 3 });
  }
  assert.deepEqual(await f.redeem(), denial("receipt_exhausted"));
  assert.equal((await state(f.claims.jti)).redemption_count, 3);
});
test("foreign subject is denied before consumption", async () => {
  const f = await fixture();
  assert.deepEqual(await f.redeem(f.receipt, "foreign"), { status: "binding_denied", phase: "binding" });
  assert.equal((await state(f.claims.jti)).redemption_count, 0);
});
test("validly signed mismatched persisted expiry denies authority", async () => {
  const f = await fixture();
  assert.deepEqual(await f.redeem(await signer({ ...f.claims, exp: f.claims.exp + 60 })), denial("authority_mismatch"));
  assert.equal((await state(f.claims.jti)).redemption_count, 0);
});
test("boolean revocation maps to non-null revocation and denies", async () => {
  const f = await fixture();
  await query.query("UPDATE public.access_entitlements SET revoked=true WHERE jti=$1", [f.claims.jti]);
  assert.deepEqual(await f.redeem(), denial("receipt_revoked"));
  assert.equal((await state(f.claims.jti)).redemption_count, 0);
});
test("expired receipt is denied by verification and persisted expiry by actual store", async () => {
  const f = await fixture();
  const now = Math.floor(Date.now() / 1000);
  const expired = { ...f.claims, iat: now - 20, nbf: now - 20, exp: now - 10 };
  await query.query("UPDATE public.access_entitlements SET issued_at=$2,not_before=$2,expires_at=$3 WHERE jti=$1", [f.claims.jti, expired.iat, expired.exp]);
  assert.deepEqual(await f.redeem(await signer(expired)), { status: "verification_denied", phase: "verification" });
  assert.deepEqual(await createPostgresAccessReceiptStore(bridge.queryAccessReceipt).consume(command(expired)), { outcome: "receipt_expired" });
  assert.equal((await state(f.claims.jti)).redemption_count, 0);
});
test("mapping is updatable and exhausted cannot drift from the single counter", async () => {
  const f = await fixture();
  assert.equal((await query.query("SELECT is_updatable FROM information_schema.views WHERE table_schema='public' AND table_name='access_receipts'"))[0]?.is_updatable, "YES");
  await query.query("UPDATE public.access_entitlements SET exhausted=true WHERE jti=$1", [f.claims.jti]);
  assert.equal((await state(f.claims.jti)).exhausted, false);
  await query.query("UPDATE public.access_entitlements SET redemption_count=3,exhausted=false WHERE jti=$1", [f.claims.jti]);
  assert.equal((await state(f.claims.jti)).exhausted, true);
  await assert.rejects(query.query("UPDATE public.access_receipts SET redemption_count=4 WHERE jti=$1", [f.claims.jti]), (e: unknown) => (e as { code: string }).code === "23514");
  assert.equal((await state(f.claims.jti)).redemption_count, 3);
});
test("24 actual Neon HTTP final-slot redemptions admit exactly one", async () => {
  const f = await fixture();
  assert.equal((await f.redeem()).status, "success");
  assert.equal((await f.redeem()).status, "success");
  const observed: number[] = [];
  const results = await Promise.all(Array.from({ length: 24 }, async () => {
    const result = await f.redeem();
    observed.push(Number((await state(f.claims.jti)).redemption_count));
    return result;
  }));
  assert.equal(results.filter((r) => r.status === "success").length, 1);
  const denied = results.filter((r) => r.status !== "success");
  assert.equal(denied.length, 23);
  for (const r of denied) assert.deepEqual(r, denial("receipt_exhausted"));
  assert(observed.every((n) => n <= 3));
  assert.deepEqual(await state(f.claims.jti), { redemption_count: 3, max_redemptions: 3, exhausted: true });
  console.log("CONCURRENCY: 24 contenders; 1 success; 23 receipt_exhausted; final 3/3; all observed counts <=3.");
});
