# Self-hosting FiberFlow

This guide is for operators who want to run FiberFlow on their own machine or server — with **their own Fiber node**, **CKB wallet key**, and **payment channels** — then connect an e-commerce site.

If you only need to plug a store into an API that someone else already hosts, start with [MERCHANT_INTEGRATION.md](MERCHANT_INTEGRATION.md) instead.

---

## What you will run

| Component | You provide / run | Notes |
|-----------|-------------------|--------|
| Fiber node | Yes (via Docker in this repo) | Holds your key and channels |
| FiberFlow API | Yes (Docker `gateway` service) | Talks to Fiber RPC internally |
| Dashboard + checkout | Yes (build `frontend/`) | Same app, often two hostnames in production |
| PostgreSQL | Yes (Neon, self-hosted, etc.) | Required for stores, invoices, auth |
| Customer Fiber wallet | Customer’s responsibility | Checkout shows QR + address only |

FiberFlow does **not** open channels for you, fund your node, or custody customer funds.

---

## Prerequisites

1. **Docker** — [Install Docker](https://docs.docker.com/get-docker/)
2. **PostgreSQL** — any Postgres URL works; [Neon](https://neon.tech) is fine
3. **CKB account + private key** — for the Fiber node wallet (see below)
4. **Testnet CKB** (for testnet) — enough to open channels (official Fiber guides often use on the order of thousands of CKB for funding + channel open)
5. **Public IP / port** (for a reachable node) — Fiber P2P uses **8228**; announce your address in config if peers should find you
6. **Bun** — only needed if you run the frontend or API outside Docker ([bun.sh](https://bun.sh))

Official Fiber references (keep these handy):

- [Fiber repository](https://github.com/nervosnetwork/fiber)
- [Connect to public testnet nodes](https://www.fiber.world/docs/quick-start/connect-nodes)
- [Basic transfer example](https://www.fiber.world/docs/quick-start/basic-transfer)

---

## 1. Prepare your CKB wallet key

The Fiber node needs a private key at:

```
data/ckb/key
```

**Format:** one line, **64 hex characters**, **no `0x` prefix**. On first start, Fiber encrypts this file using `FIBER_SECRET_KEY_PASSWORD`.

### Create or export a key with `ckb-cli`

Install [`ckb-cli`](https://github.com/nervosnetwork/ckb-cli/releases), then:

```bash
# Create an account (save the lock_arg from the output)
ckb-cli account new

# Export (replace with your lock_arg)
ckb-cli account export --lock-arg <YOUR_LOCK_ARG> --extended-privkey-path ./exported-key

# Fiber only needs the first line (the private key)
mkdir -p data/ckb
head -n 1 ./exported-key > data/ckb/key
chmod 600 data/ckb/key
rm ./exported-key

# Optional: verify
ckb-cli util key-info --privkey-path data/ckb/key
```

Fund this address on the network you will use (testnet faucet / mainnet transfer) **before** opening channels.

**Security**

- Never commit `data/ckb/key` or `.env` to git.
- Remember `FIBER_SECRET_KEY_PASSWORD`. Losing the password and the plaintext key can lock you out of funds.
- Back up `./data` regularly (see [Fiber backup guide](https://www.fiber.world/docs/guide/backup)).

---

## 2. Configure environment files

### Root `.env` (Fiber + Docker)

```bash
cp .env.example .env
```

Set at least:

| Variable | Meaning |
|----------|---------|
| `FIBER_SECRET_KEY_PASSWORD` | Password used to encrypt/decrypt `data/ckb/key` |
| `FIBER_NETWORK` | `testnet` (default) or `mainnet` |
| `FIBER_VERSION` | Docker image tag for `nervos/fiber` |
| `GATEWAY_PORT` | Host port for the API (default `3000`) |

### `server/.env` (API)

```bash
cp server/.env.example server/.env
```

| Variable | Required | Meaning |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Generate with `bunx @better-auth/cli secret` |
| `BETTER_AUTH_URL` | Yes | Public URL of the API (`http://localhost:3000` locally) |
| `CORS_ORIGIN` | Yes | Browser origins allowed (dashboard/checkout), comma-separated |
| `PAYMENT_APP_URL` | Yes | Base URL used in invoice `payment_url` values |
| `FIBER_RPC_URL` | Auto in Docker | `http://127.0.0.1:8227` |
| `FIBER_NETWORK` | Yes | Must match root `.env` (`testnet` / `mainnet`) |

Local defaults in `server/.env.example` are already set for `localhost:3000` (API) and `localhost:5173` (frontend).

Apply the database schema:

```bash
cd server
bun install
bun run db:push
```

---

## 3. Start Fiber + API

From the repo root:

```bash
./start.sh
```

This:

1. Copies `config/testnet.yml` or `config/mainnet.yml` → `data/config.yml`
2. Starts **fiber** (`nervos/fiber`) and **gateway** (FiberFlow API sharing Fiber’s network namespace)

Check:

```bash
curl http://localhost:3000/health
# {"status":"ok"}

docker compose exec fiber fnn-cli info
```

| Port | Purpose | Public? |
|------|---------|---------|
| **8228** | Fiber P2P | Yes (peers) |
| **8227** | Fiber JSON-RPC | **No** — localhost inside the container only |
| **3000** | FiberFlow HTTP API | Yes (put TLS in front in production) |

To make your node easier for others to reach, edit `announced_addrs` in `config/testnet.yml` or `config/mainnet.yml` with your public IP, then restart.

---

## 4. Payment channels

Fiber payments travel over **payment channels**, not one-off on-chain transfers for every invoice. Your node must:

1. Be online and synced
2. Have **CKB** (and any assets you accept) on the node wallet
3. Have at least one **open, ready channel** with liquidity toward peers that can route payments

FiberFlow’s API can create invoices even if channels are missing, but **customers will not be able to complete real payments** until your node is properly connected and channeled.

### How to open channels

Channel setup is part of **Fiber node operations**, not the FiberFlow dashboard. Follow the official guides for your network version:

- [Connect public testnet nodes](https://www.fiber.world/docs/quick-start/connect-nodes)
- Fiber’s [testnet nodes manual](https://github.com/nervosnetwork/fiber/blob/develop/docs/testnet-nodes.md)

Typical flow (details and amounts change over time — use the official docs for current pubkeys and minimums):

1. Connect to a public peer (`fnn-cli` / `connect_peer`).
2. Open a channel with sufficient funding (`open_channel`).
3. Wait until channel state is ready (`list_channels`).

Useful commands with this repo’s Docker setup:

```bash
docker compose exec fiber fnn-cli info
docker compose exec fiber fnn-cli channel list_channels
```

Public node addresses and funding minimums are maintained by the Fiber project — **do not rely on outdated copy-pasted pubkeys from third-party blogs**. Always check the current Fiber documentation.

---

## 5. Run the dashboard and checkout UI

```bash
cd frontend
cp .env.example .env.local
# VITE_API_URL=http://localhost:3000
bun install
bun run dev
```

Open `http://localhost:5173`:

1. **Sign up** with email/password  
2. **Create a store** (name + slug)  
3. **Settings** → create an **API key** (`ffg_...`, shown once)  
4. **Webhooks** → add your HTTPS endpoint (HTTP allowed only for `localhost`)  
5. Create a test invoice (dashboard or `POST /v1/invoices`) and open `payment_url`

Production hosting of the frontend is covered in [DEPLOY.md](DEPLOY.md).

---

## 6. Connect your e-commerce site

Integration model:

1. Your backend calls `POST /v1/invoices` with your API key  
2. You redirect the customer to `payment_url`  
3. Customer pays with a Fiber wallet  
4. Your server receives `invoice.paid` and fulfills the order  

Full API, webhook verification, and store examples: **[MERCHANT_INTEGRATION.md](MERCHANT_INTEGRATION.md)**.

There is **no** built-in Shopify or WooCommerce plugin. Any platform that can call an HTTP API and receive a webhook can integrate.

---

## 7. Checklist before going live

| Check | Why |
|-------|-----|
| `GET /health` returns OK | API is up |
| `fnn-cli info` works | Fiber node is up |
| Channels listed and ready | Payments can route |
| Dashboard signup/login works | Auth + DB OK |
| Create invoice returns `payment_url` | `PAYMENT_APP_URL` correct |
| Checkout page loads without login | Public invoice API + CORS |
| Test payment on testnet completes | End-to-end Fiber path works |
| Webhook delivers `invoice.paid` | Fulfillment path works |
| `./data` backed up | Key + channel state safety |

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `./start.sh` exits: missing key | Create `data/ckb/key` as described above |
| `./start.sh` exits: password | Set a real `FIBER_SECRET_KEY_PASSWORD` in `.env` |
| API won’t start | Missing `DATABASE_URL` or Postgres unreachable |
| `502` creating invoices | Fiber RPC down, or CKB/USD price fetch (CoinGecko) failed |
| Invoice created but payment never confirms | No ready channels / node not reachable / wrong network |
| CORS errors in browser | Add the frontend origin to `CORS_ORIGIN` |
| `payment_url` points at wrong host | Set `PAYMENT_APP_URL` (API) and `VITE_PAYMENT_APP_URL` (frontend build) |

---

## Next steps

- Production domains and reverse proxy: [DEPLOY.md](DEPLOY.md)  
- Store API + webhooks: [MERCHANT_INTEGRATION.md](MERCHANT_INTEGRATION.md)  
- Example webhook server: [../examples/node-webhook/](../examples/node-webhook/)
