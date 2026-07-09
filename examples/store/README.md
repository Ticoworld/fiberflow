# FiberFlow Store Example

Next.js storefront backed by **Neon Postgres** and **Drizzle ORM**.

## Setup

1. Copy env vars:

```bash
cp .env.example .env.local
```

2. Set `DATABASE_URL` to your Neon connection string (pooled URL recommended).

3. Install, push schema, and seed demo catalog:

```bash
bun install
bun run db:push
bun run db:seed
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
| --- | --- |
| `bun run db:push` | Push Drizzle schema to Neon |
| `bun run db:seed` | Seed products and collections |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run dev` | Start Next.js |

## Notes

- Carts are stored in Postgres and keyed by a `cartId` cookie.
- Checkout is a local demo page at `/checkout` (ready to wire FiberFlow payments).
- Cache revalidation: `POST /api/revalidate?secret=REVALIDATION_SECRET` with optional `{ "tags": ["products"] }`.
