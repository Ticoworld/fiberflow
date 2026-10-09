# FiberFlow reusable PostgreSQL store integration proof

Sections A–O and the freeze section record the original integration proof;
section C reflects the current public dependency. The final section records
the public-package recheck.

Proof and verification: October 8, 2026. Local freeze and public-package adoption: October 9, 2026.

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

Public-package adoption starts from that frozen commit,
`b8b87d81c3dc4efef0937be5ea9c87d0d8f924e2`, on
`chore/use-published-fiberlatch-postgres-store`.

## C. Public npm dependency

The example now installs `@fiberlatch/postgres-store@0.1.0` from the public npm
registry, with `@fiberlatch/access` still pinned to `0.1.1`. The manifest and Bun
lock no longer depend on a private archive or local FiberLatch source checkout.
Only the two store import specifiers changed; consumption semantics are unchanged.
The public package's compiled JavaScript and declarations are byte-for-byte
identical to the installed internal package used for the frozen proof.

From `examples/store`, install and run the existing checks:

```powershell
bun install --frozen-lockfile --ignore-scripts
bun run test
bun x --no-install tsc --noEmit
```

The original frozen proof used a private local archive because the companion
had not yet been published. That historical dependency is no longer required.
The application needs only public npm packages and host-owned configuration.
The scoped real-database test runner remains a local proof tool:
`bun run test:postgres-store` intentionally loads the existing dedicated Neon test URL
from the sibling FiberLatch `.env.local`, as described in section I. This is
test-environment setup, not a runtime/package dependency or general install step.

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

## Public npm consumer verification (October 9, 2026)

Replaced the private dependency with exact public `@fiberlatch/postgres-store@0.1.0`.
Bun resolved it from `https://registry.npmjs.org/`, then reinstalled 421 packages
using `bun install --frozen-lockfile --ignore-scripts --force` with that registry.
No other lockfile dependency versions changed; access remains `0.1.1`.
The recorded store integrity matches npm:
`sha512-dNyGe7h2T6oG5nsfLmyl/0LP8+kF5wGl7KK5mTTLB8UKBIckjdDwTpGSxmANzdyxIrQnkMJubkw8TpZ1Tj0iyg==`.

Installed ESM and CommonJS imports resolve the public package from this example's
regular `node_modules`. Its compiled JavaScript and declarations match the
previously installed proven component byte-for-byte (SHA-256 respectively
`5d7fef232f0ccf6d0de86f7b5949bedc127b79191c8eb15490916648a5f649b7` and
`9c55ff400e2185e010c6ffe96bd05e31f08e20bee5ec7dceec8fcf01661ed6a0`).
TypeScript resolves the public declarations and existing access contract.

| Check | Result |
| --- | --- |
| Existing integration suite (`bun run test`) | 12/12 PASS; tests unchanged |
| Full typecheck (`bun x --no-install tsc --noEmit`) | PASS |
| Real Neon (`bun run test:postgres-store`) | 9/9 PASS with the public installed store |
| Final-slot concurrency | 24 contenders: 1 success, 23 receipt_exhausted; final 3/3; all observed counts <=3 |
| Direct count-4 write | Rejected by the existing CHECK constraint; count stays 3 |
| Production build | PASS; 31/31 pages, using the existing ignored scoped build verifier and catalog seed |
| Full lint (`bun run lint`) | Same 9 baseline errors and 4 warnings; zero new diagnostics |
| Database cleanup after tests and build | PASS; standalone table and all original rows restored unchanged |
| Implementation comparison with b8b87d8 | Only the application/test import names changed; bridge, SQL mapping, verifier, and assertions unchanged |

Only five files changed: `package.json`, `bun.lock`, this report, and the two
store import specifiers in `lib/private-api-access.ts` and
`test/private-api-neon.test.ts`. No custom consumption SQL, shadow counter,
framework abstraction, FiberFlow core change, or local package dependency was added.
No active archive/file/workspace dependency or stale archive setup instruction
remains. Ignored historical archives and unrelated user files were left alone.

The dedicated Neon runner and existing ignored build verifier still load the
test URL from the sibling FiberLatch environment, deliberately bypassing old
FiberFlow/ambient database URLs. That is the remaining local test-environment
assumption; installing and running the integration does not require FiberLatch
source or its private archive. No credentials were printed or committed.
The pre-existing Next.js multiple-lockfile warning remains unchanged.

Commit message: `chore: use published FiberLatch postgres store`.
This branch is for the user fork only; no upstream PR, maintainer contact,
merge, deployment, npm publication, or live settlement work.

**PASS — FIBERFLOW NOW CONSUMES THE PUBLIC FIBERLATCH POSTGRES STORE**.
