# FiberFlow Store Example

Next.js storefront backed by **Neon Postgres**, **Drizzle ORM**, and **FiberFlow** payments on [backr.site](https://backr.site).

## Setup

1. Copy env vars:

```bash
cp .env.example .env.local
```

2. Set:

- `DATABASE_URL` — Neon connection string (pooled URL recommended)
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`
- `FIBERFLOW_API_KEY` — from FiberFlow dashboard → Settings (`ffg_...`)
- `FIBERFLOW_WEBHOOK_SECRET` — from FiberFlow dashboard → Webhooks (`whsec_...`)
- `FIBERFLOW_API_URL` — defaults to `https://api.backr.site`

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
