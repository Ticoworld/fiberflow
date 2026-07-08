# Production deployment

Deploy FiberFlow as three public services on one root domain:

| Subdomain | Service | Build |
|-----------|---------|-------|
| `app.example.com` | Merchant dashboard | `frontend/` |
| `api.example.com` | API server + auth | `server/` (Docker via `./start.sh`) |
| `checkout.example.com` | Customer payment page | `frontend/` (same build, different hostname) |

The dashboard and checkout are the **same frontend codebase**. Deploy the build twice (or route both hostnames to one deployment) and set `VITE_PAYMENT_APP_URL` to the checkout origin so payment links always point at checkout.

---

## Prerequisites

- PostgreSQL database (e.g. [Neon](https://neon.tech))
- Fiber node reachable from the API (Docker `./start.sh` bundles Fiber + API)
- TLS certificates for all three subdomains
- DNS A/CNAME records pointing to your hosts

---

## 1. API server (`api.example.com`)

### Environment

Copy `server/.env.example` → `server/.env` and set:

```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...                    # bunx @better-auth/cli secret
BETTER_AUTH_URL=https://api.example.com
CORS_ORIGIN=https://app.example.com,https://checkout.example.com
PAYMENT_APP_URL=https://checkout.example.com
AUTH_COOKIE_DOMAIN=example.com            # root domain for session cookies
FIBER_RPC_URL=http://127.0.0.1:8227       # set automatically in Docker
FIBER_NETWORK=testnet                     # or mainnet
NODE_ENV=production
PORT=3000
```

| Variable | Purpose |
|----------|---------|
| `BETTER_AUTH_URL` | Public API URL — must match the hostname merchants and the dashboard call |
| `CORS_ORIGIN` | Comma-separated browser origins (dashboard **and** checkout) |
| `PAYMENT_APP_URL` | Checkout subdomain — used in `payment_url` on invoices |
| `AUTH_COOKIE_DOMAIN` | Root domain so dashboard sessions work across `app` → `api` subdomains |

When `BETTER_AUTH_URL` uses `https://`, the server enables secure cookies and cross-subdomain auth automatically (using `AUTH_COOKIE_DOMAIN` or deriving from the API hostname).

### Database

```bash
cd server
bun install
bun run db:push
```

### Docker (Fiber + API)

From the repo root:

```bash
cp .env.example .env          # FIBER_SECRET_KEY_PASSWORD, FIBER_NETWORK
mkdir -p data/ckb && cp /path/to/key data/ckb/key
cp server/.env.example server/.env   # fill in values above

./start.sh
```

This starts:

- **Fiber node** — P2P on 8228, RPC internal on 8227
- **API gateway** — shares Fiber network namespace, exposes port 3000

Put a reverse proxy (nginx, Caddy, Cloudflare) in front with TLS terminating at `https://api.example.com`.

Verify:

```bash
curl https://api.example.com/health
# {"status":"ok"}
```

### Non-Docker API

Run the server where Fiber RPC is reachable:

```bash
cd server
bun run start
```

Set `FIBER_RPC_URL` to your Fiber node's RPC endpoint.

---

## 2. Frontend (`app.example.com` + `checkout.example.com`)

### Environment

Copy `frontend/.env.example` → `frontend/.env.production`:

```bash
VITE_API_URL=https://api.example.com
VITE_PAYMENT_APP_URL=https://checkout.example.com
```

Build:

```bash
cd frontend
bun install
bun run build
```

Serve the output with any static host or SSR adapter for TanStack Start. Point:

- `app.example.com` → dashboard routes (`/dashboard`, `/login`, …)
- `checkout.example.com` → payment routes (`/pay/:paymentHash`)

Both hostnames can serve the same build; only the hostname matters for which pages users land on.

Verify checkout can reach the API (no CORS errors on `/public/invoices/:hash`).

---

## 3. Post-deploy checks

```bash
# Automated (against production API)
FIBERFLOW_API_URL=https://api.example.com \
FIBERFLOW_API_KEY=ffg_your_key \
bun run smoke-test
```

Manual checklist: [`E2E_SMOKE_TEST.md`](E2E_SMOKE_TEST.md) — repeat using production URLs.

---

## Reverse proxy example (Caddy)

```caddy
app.example.com {
    reverse_proxy localhost:4173
}

checkout.example.com {
    reverse_proxy localhost:4173
}

api.example.com {
    reverse_proxy localhost:3000
}
```

Adjust upstream ports to match your process manager.

---

## Security notes

- Fiber RPC is **never** exposed publicly — only the HTTP API port
- Webhook URLs must use **HTTPS** in production (HTTP allowed only for `localhost`)
- Dashboard auth uses HttpOnly cookies with `SameSite=None; Secure` in production
- Do not commit `.env` files or API keys

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login works then session lost on refresh | Set `AUTH_COOKIE_DOMAIN` to root domain; confirm `CORS_ORIGIN` includes `https://app...` |
| CORS error on checkout | Add `https://checkout.example.com` to server `CORS_ORIGIN` |
| `payment_url` points at wrong host | Set `PAYMENT_APP_URL=https://checkout.example.com` on API |
| `502` on create invoice | Fiber node down or `FIBER_RPC_URL` unreachable |
| Auth cookie not sent | Frontend must use `credentials: 'include'` (already set in `auth-client.ts`) |
| Server fails on boot | Check production env validation — `DATABASE_URL`, `BETTER_AUTH_*`, `PAYMENT_APP_URL` required when `NODE_ENV=production` or `BETTER_AUTH_URL` is `https://` |

---

## Sign-off

| Check | Done |
|-------|------|
| `GET /health` returns 200 on production API | |
| Dashboard signup/login on `app.*` | |
| Create invoice returns `payment_url` on checkout subdomain | |
| Payment page loads without auth | |
| Real Fiber payment completes | |
| `invoice.paid` webhook delivers | |
| Smoke test passes against production API | |
