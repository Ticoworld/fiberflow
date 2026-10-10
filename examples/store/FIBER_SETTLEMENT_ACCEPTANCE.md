# Real Fiber testnet settlement acceptance

Date: October 10, 2026 (Africa/Lagos).

Branch: `chore/use-published-fiberlatch-postgres-store`.
Source commit: `2f4b28f5ff40e087580a7bc9dd619f0a2bed5e06`.

This proves a real Fiber TESTNET settlement through locally self-hosted FiberFlow
triggering the existing FiberLatch access integration. This report records the
completed local acceptance run.

## Runtime and package boundary

| Component | Local runtime |
| --- | --- |
| FiberFlow API | `http://localhost:3000`; health HTTP 200 |
| FiberFlow dashboard / checkout | `http://localhost:5175`; HTTP 200 |
| FiberLatch-integrated example store | `http://localhost:3001`; HTTP 200 |
| Merchant Fiber node | Docker `fiberflow`; internal RPC 8227, P2P 8228 |
| Separate payer Fiber node | Docker `fiberflow-test-payer`; internal RPC 8227, P2P 8228; no host port mapping |
| FiberFlow API database | Isolated local PostgreSQL container, host port 54329 |
| Example-store database | Existing user-confirmed dedicated Neon test database; connection unchanged |
| Webhook | Registered `http://localhost:3001/api/webhooks/fiberflow`; runtime-only container loopback forwarder to host store |

Both nodes ran Fiber `0.9.0-rc3` on testnet, with independently checked testnet
genesis hash. Merchant public key: `02bf9db51304…e60f5466a1`.
Payer public key: `03cc6d339ce96…8fbb35dfd9`. The identities are distinct.
Historical payer wallets, unrelated containers and existing channels were preserved.

The example used installed public npm packages `@fiberlatch/access@0.1.1` and
`@fiberlatch/postgres-store@0.1.0`. No local FiberLatch source or archive was used.
No package source, version, verifier or application behavior was modified.
Runtime credentials and configurations remain ignored and are omitted here.

## Database setup and preservation

With explicit user approval, applied exactly the committed
`sql/001_fiberlatch_postgres_store.sql`, unchanged, in one host-owned transaction.
Verified the updatable `public.access_receipts` view, validated bounded-count
CHECK and enabled `access_entitlements_sync_exhausted` trigger.

Before and immediately after migration, all 15 existing public tables had
identical row counts and canonical row digests. The three existing entitlements
were unchanged, valid and exhausted at 3/3. No reset, truncation, table recreation,
change to database credentials or connection-string replacement occurred. After the new
purchase completed, those three prior entitlements still remained at 3/3.

## Real purchase and settlement

A fresh test purchaser authenticated through the example's normal signup API.
Its existing cart and checkout server actions were invoked through HTTP to buy
exactly one existing **Private API Access** product at its unchanged $1 price.
The purchaser initially had no orders or entitlements. Checkout was submitted once.

| Identifier / result | Observation |
| --- | --- |
| Order | `a3377971-1d0c-485e-a98e-7add5af79292` |
| FiberFlow invoice | `1` |
| Payment hash, abbreviated | `0x887c4be786df…a3266f13e` |
| Invoice amount | 752.66065542 TESTNET CKB ($1) |
| Direct channel | `0x5eb53c9885ff…6ba97d9b` |
| Channel funding | One new private payer-funded channel, 1,000 testnet CKB |
| Pre-payment channel state | ChannelReady on both nodes; merchant inbound 901 CKB |
| Route dry-run | Valid direct route; zero fee |
| Real payment submissions | Exactly one |
| Payer final state | Success; zero routing fee |
| Merchant invoice final state | Paid |
| FiberFlow persisted / API state | Paid / paid |
| Observed event progression | invoice.created → invoice.received → invoice.paid |
| Merchant channel balance afterward | 752.66065542 CKB; channel remained ready |

The exact invoice amount, testnet currency, payment hash, merchant payee public
key, distinct payer identity and sufficient inbound capacity were checked before
the real payment. There was no synthetic paid webhook, manual invoice/order status
edit, manual entitlement insertion or manual redemption-counter update.

## Real webhook and FiberLatch access

FiberFlow's real webhook sender delivered created and received events with HTTP
200 on attempt 1. The first paid delivery timed out after the store processed
the event. Its normal scheduled retry succeeded with HTTP 200 on attempt 2.
The production signature verifier remained unchanged; an unsigned connectivity
probe was rejected with HTTP 401. The paid event's order and payment hash matched
the actual settled invoice.

The paid order produced exactly one durable entitlement and one JTI:
`b559fe68-58de-4721-8c77-f0adb9240476`. The retry preserved that same grant.
There was exactly one entitlement for both the order and payment reference.

Authenticated purchaser receipt retrieval returned HTTP 200. Ed25519 verification
with the configured public key passed. Subject, JTI, order intent, payment reference,
resource `fiberflow-store/private-api`, policy `private-api-three-calls-v1` and
maximum 3 were verified against the persisted entitlement.

| Protected API attempt | HTTP result | Durable count | Exhausted |
| --- | --- | --- | --- |
| Use 1 | 200, authorized response | 1/3 | false |
| Use 2 | 200, authorized response | 2/3 | false |
| Use 3 | 200, authorized response | 3/3 | true |
| Use 4 | 403, `access_denied` | 3/3 | true |

The fourth denied request did not increment the count. The HTTP route intentionally
returns generic `access_denied`; it does not expose the store's denial reason.

An unrelated fresh test account received HTTP 404 (`order_not_found`) when requesting
the purchaser's receipt, and HTTP 403 when presenting the purchaser's receipt to
the protected API. Both preserved the same grant and counter. A normal authenticated
order-page reload returned HTTP 200 and confirmed the paid order and entitlement
persisted at 3/3. No Fiber node or channel restart was needed.

## Limitations and unchanged behavior

- This was an application HTTP acceptance run, including the real existing checkout
  server actions, not a complete automated browser click-through.
- The existing background poller only polls Open invoices. Once Received was observed,
  the existing checkout status endpoint refreshed the real node's Paid state and
  caused FiberFlow to enqueue the real paid event. Autonomous progression from
  Received without a normal checkout/API status read was not proven.
- The example's existing fallback cart/return base URL assumes `localhost:3000`.
  The store was accessed directly at `localhost:3001`; the checkout return redirect
  was not validated for this port arrangement. No source workaround was introduced.
- The first paid webhook delivery exceeded the sender's existing timeout; normal
  retry behavior and duplicate-safe issuance were observed instead of hidden.
- This does NOT prove mainnet readiness, production deployment, hosted Backr
  availability or a formal security audit. No publication, upstream PR or
  maintainer contact occurred.

**PASS — REAL FIBER TESTNET SETTLEMENT TRIGGERED FIBERLATCH ACCESS END TO END**
