# FiberFlow

Accept Fiber Network payments on your online store.

FiberFlow gives you a landing page, merchant dashboard, checkout page, API, and webhooks — similar to Stripe Checkout, but for Fiber on Nervos CKB. You run it yourself (with your own wallet key). Customers pay with any Fiber-compatible wallet.

---

## Path to first payment

| Step | Guide |
|------|--------|
| 1. Install, fund, open a channel, open the dashboard | **[docs/SELF_HOSTING.md](docs/SELF_HOSTING.md)** |
| 2. Deploy on a VPS (Docker, public Fiber node, frontend, HTTPS) | **[docs/DEPLOY.md](docs/DEPLOY.md)** |
| 3. Connect your e-commerce site | [docs/MERCHANT_INTEGRATION.md](docs/MERCHANT_INTEGRATION.md) |
| 4. Sample webhook server | [examples/node-webhook/](examples/node-webhook/) |

Most people should start with the self-hosting guide and stay on **testnet** until a real test payment works.

---

## How it works

```
Customer checks out on your store
        → your server creates an invoice (FiberFlow API)
        → customer pays on the FiberFlow checkout page
        → FiberFlow sends invoice.paid to your webhook
        → you fulfill the order
```

---

## What’s in this repo

| Piece | Role |
|-------|------|
| Fiber node (Docker) | Your wallet + payment channels |
| API (`server/`) | Invoices, auth, webhooks |
| Frontend (`frontend/`) | Landing page, merchant dashboard, and customer checkout |
| PostgreSQL | You provide this (e.g. Neon) |

---

## Quick start

You need [Docker](https://docs.docker.com/get-docker/), a Postgres database ([Neon](https://neon.tech) works), and [Bun](https://bun.sh) for the frontend.

```bash
git clone https://github.com/chukwuma619/fiberflow.git
cd fiberflow

cp .env.example .env
# Set FIBER_SECRET_KEY_PASSWORD

mkdir -p data/ckb
# Put your 64-character hex private key (no 0x) in data/ckb/key

cp server/.env.example server/.env
# Set DATABASE_URL and BETTER_AUTH_SECRET

./start.sh
```

Then follow **[docs/SELF_HOSTING.md](docs/SELF_HOSTING.md)** for funding, opening a channel, starting the dashboard, and connecting your store.

Creating invoices is not enough — you must open a payment channel (covered in that guide) before customers can pay.

---

## Useful commands

```bash
docker compose logs -f
docker compose exec fiber fnn-cli info
docker compose exec fiber fnn-cli peer list_peers
docker compose exec fiber fnn-cli channel list_channels
docker compose down
```

---

## Network

Default is **testnet**. For mainnet, set `FIBER_NETWORK=mainnet` in `.env` and `server/.env`, then restart with `./start.sh`.

---

## Data and upgrades

All Fiber node data lives in `./data` (gitignored). Back it up. Losing `data/ckb/key` or `FIBER_SECRET_KEY_PASSWORD` can mean losing access to funds.

Before upgrading the Fiber image: close channels, back up `./data`, bump `FIBER_VERSION` in `.env`, then `docker compose down && docker compose pull && ./start.sh`.

---

## Status

Active development. Prefer **testnet** until you are comfortable with channels and backups on mainnet.
