# FiberFlow frontend

TanStack Start app for the merchant dashboard and hosted checkout page.

## Local development

```bash
cp .env.example .env.local   # VITE_API_URL=http://localhost:3000
bun install
bun run dev                  # http://localhost:5173
```

Requires the API server running — see [`../server/README.md`](../server/README.md).

## Production build

```bash
cp .env.example .env.production
# VITE_API_URL=https://api.example.com
# VITE_PAYMENT_APP_URL=https://checkout.example.com

bun install
bun run build
bun run preview              # optional local preview
```

Deploy the same build to both:

- `app.example.com` — dashboard (`/dashboard`, auth routes)
- `checkout.example.com` — payment page (`/pay/:paymentHash`)

See [`../docs/DEPLOY.md`](../docs/DEPLOY.md) for the full production setup.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Dev server on port 5173 |
| `bun run build` | Production build |
| `bun run preview` | Preview production build |
| `bun run lint` | ESLint |

Self-hosting and merchant setup: [`../docs/SELF_HOSTING.md`](../docs/SELF_HOSTING.md), [`../docs/MERCHANT_INTEGRATION.md`](../docs/MERCHANT_INTEGRATION.md).
