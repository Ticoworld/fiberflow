# FiberFlow

**FiberFlow** is a self-hostable payment gateway for the [Fiber Network](https://github.com/nervosnetwork/fiber) (Nervos CKB). It lets you accept Fiber payments on your own store: create invoices, send customers to a hosted checkout page, and fulfill orders when payment is confirmed.

You run your own Fiber node and wallet. FiberFlow sits in front of that node and gives you a merchant dashboard, REST API, checkout page, and signed webhooks — similar in shape to Stripe Checkout, but for Fiber.

---

## What problem this solves

Fiber is a payment network on CKB. Running a Fiber node alone is not enough for an online store: you still need invoices tied to orders, a page customers can pay on, and a reliable signal when money has arrived.

FiberFlow provides that layer:

| Without FiberFlow | With FiberFlow |
|-------------------|----------------|
| Talk to Fiber RPC yourself | Create invoices with a simple HTTP API |
| Build your own payment UI | Hosted checkout with QR + payment address |
| Poll Fiber for payment status | Signed `invoice.paid` webhooks to your server |
| No merchant tools | Dashboard for stores, API keys, invoices, webhooks |

**What it is not:** FiberFlow is not a hosted SaaS you sign up for elsewhere, not a Shopify/WooCommerce plugin, and not a custodial wallet. You operate the node and hold the keys.

---

## How it works (high level)

```
Customer checkout on your store
        │
        ▼
Your backend creates an invoice  ──►  FiberFlow API  ──►  Your Fiber node
        │
        ▼
Customer pays on checkout page   ──►  Fiber wallet (QR / address)
        │
        ▼
FiberFlow confirms payment       ──►  POST invoice.paid to your webhook
        │
        ▼
Your store fulfills the order
```

Customers pay with **any Fiber-compatible wallet** that can send to the invoice address shown on the checkout page. FiberFlow does not embed a specific wallet (JoyID, Neuron, etc.) — it shows a QR code and address.

---

## What’s in this repo

| Piece | Role |
|-------|------|
| **Fiber node** (Docker) | Your node on the Fiber network; holds the CKB key and payment channels |
| **API server** (`server/`) | Merchant API, auth, invoice sync, webhooks |
| **Frontend** (`frontend/`) | Merchant dashboard + customer checkout page |
| **PostgreSQL** | App database (stores, invoices, keys, webhooks) — you provide this |

Docker Compose starts the **Fiber node + API**. The dashboard/checkout frontend is built and hosted separately.

---

## Documentation

| Guide | Who it’s for |
|-------|----------------|
| **[Self-hosting](docs/SELF_HOSTING.md)** | Run FiberFlow with your own Fiber node, wallet key, and channels |
| **[Production deploy](docs/DEPLOY.md)** | Put API + dashboard + checkout on your domain with TLS |
| **[Merchant / e-commerce integration](docs/MERCHANT_INTEGRATION.md)** | Connect your store via API, checkout redirect, and webhooks |
| **[Example webhook receiver](examples/node-webhook/)** | Minimal Node.js server that verifies signatures |

---

## Quick start (local)

**Prerequisites**

- [Docker](https://docs.docker.com/get-docker/)
- A [PostgreSQL](https://www.postgresql.org/) database (e.g. [Neon](https://neon.tech))
- A CKB private key for the Fiber node (see [Self-hosting](docs/SELF_HOSTING.md))
- [Bun](https://bun.sh/) if you run the frontend or API outside Docker

```bash
git clone https://github.com/chukwuma619/fiberflow.git
cd fiberflow

cp .env.example .env
# Set FIBER_SECRET_KEY_PASSWORD to a strong password

mkdir -p data/ckb
# Put your 64-character hex private key (no 0x) in data/ckb/key
# See docs/SELF_HOSTING.md

cp server/.env.example server/.env
# Set DATABASE_URL, BETTER_AUTH_SECRET, and leave local URLs as defaults

./start.sh
```

- API health: `http://localhost:3000/health`
- Fiber P2P: port **8228**
- Fiber RPC stays internal on **8227** (not exposed publicly)

**Frontend (dashboard + checkout):**

```bash
cd frontend
cp .env.example .env.local   # VITE_API_URL=http://localhost:3000
bun install
bun run dev                  # http://localhost:5173
```

Then open the app, sign up, create a store, add an API key and webhook, and follow the [merchant guide](docs/MERCHANT_INTEGRATION.md).

> **Important:** Creating invoices is not enough for real payments. Your Fiber node must be funded and have **open payment channels** on the network. See [Self-hosting → Payment channels](docs/SELF_HOSTING.md#payment-channels).

---

## Production domains

Typical setup uses three hostnames on one root domain:

| Hostname | Purpose |
|----------|---------|
| `app.example.com` | Merchant dashboard |
| `api.example.com` | API + auth |
| `checkout.example.com` | Customer payment page (`/pay/:paymentHash`) |

Details: [docs/DEPLOY.md](docs/DEPLOY.md).

---

## Useful commands

```bash
docker compose logs -f                    # all logs
docker compose logs -f gateway            # API only
docker compose exec fiber fnn-cli info    # node info
docker compose exec fiber fnn-cli channel list_channels
docker compose down                       # stop
```

---

## Network

Default is **testnet**. For mainnet, set in `.env`:

```
FIBER_NETWORK=mainnet
```

Edit `config/testnet.yml` or `config/mainnet.yml` (for example to announce your public IP), then restart with `./start.sh`.

---

## Data and upgrades

All Fiber node data lives in `./data` (gitignored). Back it up before upgrades. Losing `data/ckb/key` or `FIBER_SECRET_KEY_PASSWORD` can mean losing access to funds.

When a new [Fiber release](https://github.com/nervosnetwork/fiber/releases) ships:

1. **Close open channels** first (protocol/storage can change between versions).
2. **Back up** `./data`.
3. Bump `FIBER_VERSION` in `.env` (tags: [nervos/fiber on Docker Hub](https://hub.docker.com/r/nervos/fiber/tags)).
4. `docker compose down && docker compose pull && ./start.sh`

---

## License / status

This project is under active development. Prefer **testnet** until you are comfortable operating a Fiber node, channels, and backups on mainnet.
