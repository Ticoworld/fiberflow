# FiberFlow Store Example

Next.js storefront that shows how a merchant integrates **FiberFlow** payment infrastructure (Neon Postgres, Drizzle ORM, invoices + webhooks).

**Live demo (for judges / testers):** [fiberflow-eight.vercel.app](https://fiberflow-eight.vercel.app/) — already connected to FiberFlow at [backr.site](https://backr.site/). Register, add items, check out, and pay. Details: [See it in action](../../docs/MERCHANT_INTEGRATION.md#see-it-in-action-live-demo).

## Setup

1. Create `.env.local` and add the environment variables below.

2. Set:

- `DATABASE_URL` — Neon connection string (pooled URL recommended)
- Node.js `>=22.12.0` (required by `@fiberlatch/access@0.1.1`)
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`
- `FIBERFLOW_API_KEY` — from FiberFlow dashboard → Settings (`ffg_...`)
- `FIBERFLOW_WEBHOOK_SECRET` — from FiberFlow dashboard → Webhooks (`whsec_...`)
- `FIBERFLOW_API_URL` — defaults to `https://api.backr.site`
- `FIBERLATCH_PRIVATE_JWK` / `FIBERLATCH_PUBLIC_JWK` — persistent Ed25519 JWKs for the server-only access receipt integration
- `FIBERLATCH_ISSUER` / `FIBERLATCH_AUDIENCE` — stable receipt issuer and private API audience

3. In the FiberFlow dashboard, add webhook URL:

```text
https://YOUR_STORE_DOMAIN/api/webhooks/fiberflow
```

For local testing, expose the store with a tunnel and use that HTTPS URL.

4. Install, push schema, and seed demo catalog:

```bash
bun install
bun run db:push
bun run db:seed
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checkout flow

1. Customer signs in and adds items to cart
2. `/checkout` creates a pending order and a FiberFlow invoice
3. Customer is redirected to `payment_url` on backr.site
4. FiberFlow sends `invoice.paid` to `/api/webhooks/fiberflow`
5. Customer returns to `/checkout/success?order=...`
6. A paid `Private API Access` order exposes a three-call private API demo on its order page.

Generate a persistent Ed25519 key pair for local development with Node.js and
place the JSON JWK values in the two FiberLatch environment variables. Do not
commit either private key or use an ephemeral key in a persistent deployment.

## Scripts

| Script | Description |
| --- | --- |
| `bun run db:push` | Push Drizzle schema to Neon |
| `bun run db:seed` | Seed products and collections |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run dev` | Start Next.js |

## Notes

- Auth uses [Better Auth](https://www.better-auth.com/) with email/password (`/sign-in`, `/sign-up`).
- Carts are stored in Postgres and keyed by a `cartId` cookie.
- Order history lives at `/account`.
- Cache revalidation: `POST /api/revalidate?secret=REVALIDATION_SECRET` with optional `{ "tags": ["products"] }`.
