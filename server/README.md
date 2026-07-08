FiberFlow API server — Fiber payment gateway backend.

Built with [Bun](https://bun.sh), [Hono](https://hono.dev), [Drizzle ORM](https://orm.drizzle.team), and [Better Auth](https://better-auth.com).

For operators and merchants, start with the root [README](../README.md) and:

- [Self-hosting](../docs/SELF_HOSTING.md)
- [Production deploy](../docs/DEPLOY.md)
- [Merchant integration](../docs/MERCHANT_INTEGRATION.md)

## Setup

```bash
cp .env.example .env
# set DATABASE_URL, BETTER_AUTH_SECRET (bunx @better-auth/cli secret)

bun install
bun run db:push
bun run dev
```

Requires a reachable Fiber RPC (`FIBER_RPC_URL`, default `http://127.0.0.1:8227`).

## Docker

Started automatically by `./start.sh` from the repo root. Uses `server/.env` for database and auth config. Fiber RPC is injected as `http://127.0.0.1:8227` via Compose.

## Routes

### `/v1/*` — merchant API (API key auth)

| Route | Description |
|-------|-------------|
| `POST /v1/invoices` | Create invoice |
| `GET /v1/invoices` | List invoices |
| `GET /v1/invoices/:id` | Get invoice |
| `GET /v1/invoices/by-order/:orderId` | Get invoice by order id |
| `POST /v1/invoices/:id/cancel` | Cancel open invoice |

See [`docs/MERCHANT_INTEGRATION.md`](../docs/MERCHANT_INTEGRATION.md).

### `/public/*` — unauthenticated (payment page)

| Route | Description |
|-------|-------------|
| `GET /public/invoices/:paymentHash` | Public invoice status for checkout |

### `/api/*` — dashboard (session auth)

| Route | Description |
|-------|-------------|
| `GET/POST /api/auth/*` | Better Auth |
| `/api/stores/:storeId/invoices` | Dashboard invoices |
| `/api/stores/:storeId/webhooks` | Webhook management |
| `/api/stores/:storeId/api-keys` | API key management |

### Other

| Route | Description |
|-------|-------------|
| `GET /health` | Health check |

## Database scripts

```bash
bun run db:push      # push schema to Postgres
bun run db:generate  # generate Drizzle migrations
bun run db:migrate   # run migrations
bun run db:studio    # Drizzle Studio
bun run auth:generate # regenerate Better Auth schema
```
