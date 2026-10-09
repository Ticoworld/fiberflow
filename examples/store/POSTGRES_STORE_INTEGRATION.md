# FiberFlow reusable PostgreSQL store integration proof

Proof and verification: October 8, 2026. Local freeze: October 9, 2026.

## A. Reference app freeze commit

Reviewed all seven changed files against the completed proof. No secrets or
unrelated changes found. Committed on its existing branch:
`1396022130ae8971dddace83b71633b130d2b5a1`
(`feat: use reusable FiberLatch PostgreSQL store`). Working tree was clean
after the commit. No merge; no subsequent reference-app work.

## B. FiberFlow branch

`feat/use-fiberlatch-postgres-store`, created from `fiberlatch-integration` at
`96a96e26c7c3aeac9fcef486073586f88c3c6986`. Frozen locally on October 9, 2026
with commit message `feat: use reusable FiberLatch PostgreSQL store`.

## C. Local package link method

Private `npm pack` archive of `fiberlatch-postgres-store-internal@0.0.0-development`
from FiberLatch's proven `fdc5177` plus packaging-only `5897d30`.
Archive: `.test-data/local-packages/fiberlatch-postgres-store-internal-0.0.0-development.tgz`.
The example's package manifest and Bun lock point to this local archive.
Its SHA-1 is `0635f9c231f2d80fb13c11cb1f1526c1ea6c752e`, identical to the
reference proof archive; Bun records SHA-512 integrity. It contains six files:
compiled JS/types, manifest, schema SQL, README, and ACCEPTANCE. Installed JS
and types were verified byte-for-byte against the compiled proven component.
The importer resolves to the regular installed package, not copied source.

From `examples/store`, prepare the ignored archive before installing:

```powershell
npm --prefix ../../../fiber-latch run build --workspace fiberlatch-postgres-store-internal
$archiveDirectory = Join-Path (Get-Location) '.test-data/local-packages'
New-Item -ItemType Directory -Force -Path $archiveDirectory | Out-Null
npm --prefix ../../../fiber-latch pack --workspace fiberlatch-postgres-store-internal --pack-destination $archiveDirectory
bun install --frozen-lockfile --ignore-scripts
npm test
npm run test:postgres-store
node node_modules/typescript/bin/tsc --noEmit
```

Initial package linking used `bun add --ignore-scripts` with the archive path.
This requires the sibling FiberLatch repo and local pack preparation. It is a
temporary proof dependency, not a published or deployment-ready arrangement.
Existing dependency lock entries remain unchanged; Bun added `configVersion: 0`.
An initial npm installation caused a local esbuild version mismatch. Reinstalling
from the frozen Bun lock restored the original dependency versions before the
successful validation; no dependency upgrades are included in the diff.

## D. Query executor bridge

`lib/db/index.ts` reuses the existing host-created Neon HTTP client:

```ts
export async function queryAccessReceipt(sqlText: string, parameters: readonly (string | number | null)[]) {
  return { rows: await sql.query(sqlText, [...parameters]) };
}
```

One parameterized query, no SQL rewriting, retries, pool, connection release,
or transaction ownership. PostgreSQL boolean/null results are preserved. Neon
HTTP autocommits the store's single atomic statement before successful return.
Drizzle remains the application's issuance/lookup layer.

## E. Schema compatibility approach

Explicit host migration: `sql/001_fiberlatch_postgres_store.sql`.
An updatable single-table `public.access_receipts` view aliases existing
`access_entitlements` columns. The read-only `revoked_at` expression projects
boolean revocation to NULL or a non-null epoch sentinel. It does not claim to
record a historical revocation timestamp. Store updates/locks reach the original
row; no copied authority, duplicate entitlements, or shadow counters exist.

The retained `exhausted` boolean is derived metadata. A BEFORE trigger sets it
from `redemption_count >= max_redemptions` on inserts and relevant updates,
and the migration normalizes any existing stale flag. Consumption never consults
this flag. A CHECK prevents counts outside 0..maximum. No table rewrite, column
replacement, counter reset, or authority change is required.

The migration intentionally fails on an existing `access_receipts` relation or
invalid existing counts instead of replacing authority or repairing quota.
It is explicit SQL, not an automatic application-startup migration; the existing
Drizzle schema file and normal migration configuration are unchanged. Future
schema tooling must preserve this host view/trigger/constraint.

## F. Files changed

All paths below are under `examples/store` (11 files):

- `.gitignore`
- `bun.lock`
- `package.json`
- `lib/db/index.ts`
- `lib/private-api-access.ts`
- `sql/001_fiberlatch_postgres_store.sql`
- `scripts/test-postgres-store.mjs`
- `test/private-api-integration.test.ts`
- `test/private-api-neon.test.ts`
- `test/tsconfig.neon.json`
- `POSTGRES_STORE_INTEGRATION.md`

## G. Store replacement

The entire custom `consume` implementation is replaced by
`const store = createPostgresAccessReceiptStore(queryAccessReceipt)`.
Conditional UPDATE, authority/state/time comparisons, counter increment,
exhaustion admission, and diagnostic SELECT/denial logic disappeared from the
production application. The protected redemption flow still supplies ownership,
expected policy/resource/intent/maximum, trusted time, and verified claims.

Webhook verification, invoice interpretation, payment hash checks, order status,
eligibility, issuance/deduplication/JTI, lookup, authentication, signing/retrieval,
subject checks, final API response and all Fiber settlement code are unchanged.

## H. Existing test results

Baseline: 11/12 passed; the existing tamper fixture could replace only unused
base64url padding bits and leave the decoded signature unchanged. The fixture now
changes the first signature character, guaranteeing a different signature byte.
After replacement and that test-only correction: 12/12 passed.
These pre-existing tests use an in-memory test store; they are not the database
proof. Full application TypeScript check passed. ESLint passed for all changed
runtime, test and runner code. The later final verification below also passed the
production build; no browser/HTTP acceptance harness existed or was invented.

## I. Real Neon test results

9/9 new cases passed using the actual application functions, installed store,
existing Neon HTTP client and real fresh Neon PostgreSQL:
issuance/concurrent duplicates; receipt lookup/signing; three uses/fourth denial;
foreign subject; signed persisted-authority mismatch; boolean revocation; expired
verification plus direct persisted-expiry denial; updatable view/derived flag/
bounded constraint; and final-slot concurrency.

The runner ignores ambient and FiberFlow environment-file DATABASE_URL values.
It loads only the sibling FiberLatch `.env.local` value into the child process
without logging credentials. It generates the full existing 15-table FiberFlow
schema offline and applies it only in this fresh database. It refuses existing
FiberFlow tables. The pre-existing standalone `public.access_receipts` table is
temporarily moved into a dedicated preservation schema; no rows are copied,
modified, dropped, or truncated. Setup and cleanup each use a host-owned Neon
batch transaction; the reusable runtime store owns no transactions.

Migration acceptance additionally proved an existing entitlement's complete
authority/counter snapshot survives unchanged while a stale exhausted flag is
corrected. Cleanup removed only this run's newly created FiberFlow schema/fixtures,
restored the standalone table and compared every original row unchanged.
No old FiberFlow/reference database, Docker, provider request, or live settlement
was used. Tests use trusted paid-order fixtures, not a new real Fiber payment.

## J. Concurrency result

Starting count 2, maximum 3; 24 concurrent actual application redemption calls.
Exactly 1 success, 23 consumption denials, each `receipt_exhausted`.
Final original entitlement counter: 3/3; exhausted flag true.
Every contender's observed count stayed <=3. A separate attempted view write
to count 4 was rejected with PostgreSQL CHECK violation `23514`.

## K. Before versus after integration burden

Physical lines include formatting/braces, compared with the branch base.

| Area | Before | After |
| --- | ---: | ---: |
| Custom consume/store implementation | 68 | 1 factory line |
| Custom consumption query builder | 28 | 0 |
| Diagnostic SELECT query builder | 4 | 0 |
| Literal SQL templates within the builder | 2 | 0 |
| New executor bridge | 0 | 3 code lines, 5 including comment/spacing |
| Compatibility DDL | 0 | 30 physical lines, 21 excluding comments |
| `private-api-access.ts` total | 333 | 265 |

The original queries were Drizzle expressions, not 32 lines of literal SQL.
The 32-line builder measure includes its projections and syntax. The comparison
counts both original queries explicitly and does not inflate literal SQL savings.
The access runtime shrank 68 lines; adding 5 bridge lines and 30 DDL lines leaves
33 fewer physical lines across those production integration files. Tests,
documentation and dependency metadata make the repository diff larger overall.
The important improvement is removal of the independently implemented bounded
consumption state machine. The host retains only query wiring and schema mapping,
including a small flag synchronization trigger, rather than admission/denial SQL.

## L. Changes to PostgreSQL store

None. Only rebuilt and packed the proven component. No contract widening.

## M. Changes to @fiberlatch/access

None. Manifest/installed version remain 0.1.1.

## N. Git status

Reference app: frozen commit above, clean immediately afterward, left alone.
FiberFlow: all 11 integration files are included in the local freeze commit on
the new branch. Archive/generated schema/node_modules remain ignored. FiberLatch source
unchanged; the existing unrelated untracked `outputs/` directory is untouched.
No merge, PR, publication, release, deployment, upstream modification or settlement
work. Stop here for PM review.

## O. Final verdict

PASS — REUSABLE STORE IMPROVES FIBERFLOW INTEGRATION


## Final verification (October 8) and approved freeze (October 9, 2026)

This follow-up changes no application, store, access package, test, schema, or
package-manager configuration code. It reviews the existing integration and
records the full project checks. PM authorized the local freeze on October 9
with known baseline lint debt kept separate. All eleven integration files are
included in the local freeze commit; no checks or database proofs were rerun
for this documentation and commit step.

| Check | Command / evidence | Result |
| --- | --- | --- |
| Diff review | All tracked diffs and five new files reviewed; empty index; environment files excluded; credential scan | PASS |
| Signature fixture | First signature character changes decoded signature bytes; both original verification_denied assertions retained; production verifier unchanged | PASS |
| Relevant test suite | bun run test | 12/12 PASS |
| Full typecheck | bun x --no-install tsc --noEmit | PASS |
| Full lint | bun run lint | FAIL: 9 pre-existing baseline errors, 4 warnings; zero new integration diagnostics |
| Production build | bun run build, with existing db:seed in isolated fresh-database tables | PASS; 31/31 static pages generated |
| Existing browser / HTTP acceptance | No existing mechanism found in repository scripts, tests, dependencies, or documentation | Not available; no new framework created |
| Previous Neon proof | Prior 9/9, 24 contenders, 1 success / 23 exhaustion denials, final 3/3 | Retained; redemption/concurrency tests not rerun |
| Freeze commit | Approved October 9 with baseline lint debt acknowledged | Frozen locally; no lint fixes or suppressions |

Full lint reports five no-explicit-any errors, two prefer-const errors, and two
react-hooks/set-state-in-effect errors. Every diagnostic file and the ESLint
configuration was compared against baseline 96a96e26c7c3aeac9fcef486073586f88c3c6986
and is unchanged. Full repository lint remains red due to 9 pre-existing baseline
errors. The PostgreSQL-store integration introduces no new lint diagnostics.
No unrelated fixes or lint-rule suppressions were introduced.

| Unchanged file | Diagnostics |
| --- | --- |
| components/cart/actions.ts | Errors at 16, 31, 55 (any), 98 and 103 (prefer-const); warnings at 26 and 49 |
| components/cart/cart-context.tsx | Hook dependency warning at 238 |
| components/cart/delete-item-button.tsx | any error at 13 |
| components/cart/edit-item-quantity-button.tsx | any error at 39 |
| components/cart/modal.tsx | set-state-in-effect error at 44 |
| components/grid/tile.tsx | alt-text warning at 32 |
| components/layout/navbar/mobile-menu.tsx | set-state-in-effect error at 30 |

The first build compiled and typechecked but encountered EmptyGenerateStaticParamsError
because the temporary schema had no catalog. The existing db:seed script populated
only this run's newly created tables with six products and four collections. The
representative build then passed without source changes, including the receipt,
protected API, webhook, product and account routes. Next.js still emitted its
existing multiple-lockfile workspace-root warning; configuration was not changed.

Fresh-database setup was needed for production prerendering; the costly redemption
and concurrency proof was not repeated. An ignored temporary verifier reused the
existing scoped setup/cleanup, supplied ephemeral signing/authentication keys,
and redirected FiberFlow API configuration to an unused loopback address. Neither
old application database was used. After both build attempts, cleanup restored the
standalone receipt table and compared all original rows unchanged. No credentials
were printed or written into candidate commit files. The reference app and
FiberLatch store branch were left untouched.

The integration is frozen locally on feat/use-fiberlatch-postgres-store with
commit message `feat: use reusable FiberLatch PostgreSQL store`. Its parent is
96a96e26c7c3aeac9fcef486073586f88c3c6986. No push, merge, PR, publication, release,
deployment, or live settlement action was performed. Further work waits for PM
approval.

Freeze verdict: **PASS — FIBERFLOW POSTGRES STORE INTEGRATION FROZEN**.
