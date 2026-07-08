# Production deployment

Deploy FiberFlow as three public services on one root domain:

| Subdomain | Service | Build |
|-----------|---------|-------|
| `app.example.com` | Merchant dashboard | `frontend/` |
| `api.example.com` | API server + auth | `server/` (Docker via `./start.sh`) |
| `checkout.example.com` | Customer payment page | `frontend/` (same build, different hostname) |

The dashboard and checkout are the **same frontend codebase**. Deploy the build twice (or route both hostnames to one deployment) and set `PAYMENT_APP_URL` / `VITE_PAYMENT_APP_URL` so payment links always point at the checkout origin.

Before production DNS/TLS, complete node + wallet + channel setup in [SELF_HOSTING.md](SELF_HOSTING.md).

---

## Prerequisites

- PostgreSQL database (e.g. [Neon](https://neon.tech))
- Fiber node reachable from the API (Docker `./start.sh` bundles Fiber + API)
- Open payment channels on that node (see [SELF_HOSTING.md](SELF_HOSTING.md#payment-channels))
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
FIBER_RPC_URL=http://127.0.0.1:8227       # set automatically in Docker
FIBER_NETWORK=testnet                     # or mainnet
PORT=3000
```

| Variable | Purpose |
|----------|---------|
| `BETTER_AUTH_URL` | Public API URL — must match the hostname merchants and the dashboard call |
| `CORS_ORIGIN` | Comma-separated browser origins (dashboard **and** checkout). Also used as Better Auth `trustedOrigins`. |
| `PAYMENT_APP_URL` | Checkout origin — used when building `payment_url` on invoices |
| `FIBER_NETWORK` | Must match the Fiber node (`testnet` → currency `fibt`, `mainnet` → `fibb`) |

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
mkdir -p data/ckb && # place key at data/ckb/key — see SELF_HOSTING.md
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

Set `FIBER_RPC_URL` to your Fiber node's RPC endpoint (keep RPC off the public internet).

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

## 3. Auth cookies across subdomains

Dashboard sessions use Better Auth against `BETTER_AUTH_URL` (the API host). The frontend must call the API with credentials included (already configured in the app).

For `https://app.example.com` → `https://api.example.com`:

1. Set `CORS_ORIGIN` to include both `https://app.example.com` and `https://checkout.example.com`.
2. Use real HTTPS in production so browsers accept secure cookies.
3. If login succeeds but the session disappears on refresh, confirm `BETTER_AUTH_URL` matches the public API URL and that the browser is not blocking third-party / cross-site cookies for your setup.

---

## 4. Post-deploy checks

Manual checklist:

| Check | Done |
|-------|------|
| `GET /health` returns 200 on production API | |
| Dashboard signup/login on `app.*` | |
| Fiber node online; channels ready | |
| Create invoice returns `payment_url` on checkout subdomain | |
| Payment page loads without auth | |
| Real Fiber payment completes | |
| `invoice.paid` webhook delivers | |

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
- Do not commit `.env` files, API keys, or `data/ckb/key`
- Back up `./data` (node identity, encrypted key, channel store)

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login works then session lost on refresh | Confirm `BETTER_AUTH_URL` and `CORS_ORIGIN`; check browser cookie / SameSite behavior for cross-subdomain API calls |
| CORS error on checkout | Add `https://checkout.example.com` to server `CORS_ORIGIN` |
| `payment_url` points at wrong host | Set `PAYMENT_APP_URL=https://checkout.example.com` on API |
| `502` on create invoice | Fiber node down, `FIBER_RPC_URL` unreachable, or CKB price fetch failed |
| Auth cookie not sent | Frontend must use `credentials: 'include'` (already set in `auth-client.ts`) |
| Server fails on boot | Check `DATABASE_URL` is set and Postgres is reachable |

---

## Related docs

- [SELF_HOSTING.md](SELF_HOSTING.md) — node, wallet, channels  
- [MERCHANT_INTEGRATION.md](MERCHANT_INTEGRATION.md) — store API and webhooks
