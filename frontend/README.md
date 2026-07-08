# FiberFlow frontend

One app for:

| Route | Purpose |
|-------|---------|
| `/` | Marketing landing (Sign in / Get started). Signed-in users go to `/dashboard` |
| `/login`, `/signup`, `/onboarding`, `/dashboard/...` | Merchant dashboard |
| `/pay/:paymentHash` | Customer checkout |

In production the **apex domain** (`https://example.com`) serves landing + dashboard. Only **api** and **checkout** use subdomains.

## Local development

```bash
cp .env.example .env.local   # VITE_API_URL=http://localhost:3000
bun install
bun run dev                  # http://localhost:5173
```

Open the root URL to see the landing page. Requires the API running — see [../docs/SELF_HOSTING.md](../docs/SELF_HOSTING.md).

## Production (VPS)

`VITE_API_URL` and `VITE_PAYMENT_APP_URL` are baked in at **build** time.

### Docker

```bash
docker build -t fiberflow-web \
  --build-arg VITE_API_URL=https://api.example.com \
  --build-arg VITE_PAYMENT_APP_URL=https://checkout.example.com \
  .

docker run -d --name fiberflow-web --restart unless-stopped \
  -p 127.0.0.1:4173:3000 fiberflow-web
```

### Bun on the server

```bash
cp .env.example .env.production
# set VITE_API_URL and VITE_PAYMENT_APP_URL

bun install
bun run build
PORT=4173 HOST=0.0.0.0 bun run start
```

Put Caddy/nginx in front of port 4173 for `example.com` (landing + dashboard) and `checkout.example.com` (payment links) — full steps: [../docs/DEPLOY.md](../docs/DEPLOY.md).

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Dev server on port 5173 |
| `bun run build` | Production build (Nitro → `.output/`) |
| `bun run start` | Run production server (`node .output/server/index.mjs`) |
| `bun run lint` | ESLint |
