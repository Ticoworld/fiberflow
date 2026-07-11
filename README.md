# FiberFlow

Merchant payment infrastructure for Fiber Network.

FiberFlow is the checkout layer stores plug into: landing page, merchant dashboard, hosted payment page, invoice API, and webhooks — similar to Stripe Checkout, but for Fiber on Nervos CKB. You run it yourself (with your own wallet key). Customers pay with any Fiber-compatible wallet.

This is **infrastructure for merchants and developers**, not a consumer app. Other stores and products use FiberFlow to accept Fiber payments without rebuilding invoices, checkout, and settlement notifications from scratch.

**In plain terms:** your customer checks out → FiberFlow shows them a payment page → they pay over Fiber → your store gets a webhook and you fulfill the order. You keep the keys; there is no hosted FiberFlow cloud that holds your funds.

---

## Try it now (no local install)

| Role | Live link | What to do |
|------|-----------|------------|
| Customer / store demo | [fiberflow-eight.vercel.app](https://fiberflow-eight.vercel.app/) | Register or sign in → add items → check out → pay on the FiberFlow payment page |
| Merchant dashboard | [backr.site](https://backr.site/) | Sign up → create a store → explore invoices, API keys, and webhooks |

Both links are public and already connected. Full peer / channel steps for a real testnet payment: [See it in action](docs/MERCHANT_INTEGRATION.md#see-it-in-action-live-demo).

To pay on testnet you need a Fiber node ([Fiber Studio](https://github.com/chukwuma619/fiber-studio) recommended, or the [CLI](https://www.fiber.world/docs/quick-start/run-a-node)), connected to the demo peer with an open channel.

---

## Path to first payment

| Step | Guide | Who it’s for |
|------|--------|--------------|
| 1. Install locally, fund, open a channel, open the dashboard | **[docs/SELF_HOSTING.md](docs/SELF_HOSTING.md)** | Everyone — start here |
| 2. Put FiberFlow on a VPS with HTTPS | **[docs/DEPLOY.md](docs/DEPLOY.md)** | When you’re ready for real customers |
| 3. Connect your e-commerce site | [docs/MERCHANT_INTEGRATION.md](docs/MERCHANT_INTEGRATION.md) | You or your developer |
| 4. Sample webhook server | [examples/node-webhook/](examples/node-webhook/) | Developers testing webhooks |

Most people should finish **step 1 on testnet** (including one successful test payment) before deploying or going to mainnet.

**Store owners without a developer:** FiberFlow has no Shopify/WooCommerce plugin yet. You can still run FiberFlow and create invoices from the dashboard; wiring automatic checkout into your store needs someone who can call an HTTPS API. See the handoff section in [MERCHANT_INTEGRATION.md](docs/MERCHANT_INTEGRATION.md).

---

## How it works

```
Customer checks out on your store
        → your server creates an invoice (FiberFlow API)
        → customer pays on the FiberFlow checkout page
        → FiberFlow sends invoice.paid to your webhook
        → you fulfill the order
```

A **payment channel** is required before customers can pay. Creating invoices alone is not enough — the self-hosting guide covers funding and opening a channel.

---

## What’s in this repo

| Piece | Role |
|-------|------|
| Fiber node (Docker) | Your wallet + payment channels |
| API (`server/`) | Invoices, auth, webhooks |
| Frontend (`frontend/`) | Landing page, merchant dashboard, and customer checkout |
| PostgreSQL | You provide this (e.g. Neon) |
| Example store (`examples/store/`) | Next.js storefront integrated with FiberFlow |

---

## Quick start

Follow **[docs/SELF_HOSTING.md](docs/SELF_HOSTING.md)** from the top. That guide walks through cloning, tools, wallet key, database, starting FiberFlow, opening a channel, and the dashboard.

You will need:

- [Docker](https://docs.docker.com/get-docker/)
- A free [Neon](https://neon.tech) Postgres database (or any Postgres)
- [Bun](https://bun.sh) (dashboard + database setup)
- [`ckb-cli`](https://github.com/nervosnetwork/ckb-cli/releases) (create the node wallet key)
- About **100,000 testnet CKB** from the [faucet](https://faucet.nervos.org) (enough for a large receive channel)

Minimal command outline (details and order matter — use the full guide):

```bash
git clone https://github.com/chukwuma619/fiberflow.git
cd fiberflow
# … create data/ckb/key, copy .env files, bun run db:push …
./start.sh
# … fund node, open channel, then …
cd frontend && bun install && bun run dev
```

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
