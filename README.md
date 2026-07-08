# FiberFlow

Run a [Fiber Network Node](https://github.com/nervosnetwork/fiber) with Docker in a few steps.

## Quick start

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) installed.

```bash
git clone https://github.com/chukwuma619/fiberflow.git
cd fiberflow

cp .env.example .env          # set FIBER_SECRET_KEY_PASSWORD
mkdir -p data/ckb
# put your CKB private key in data/ckb/key

./start.sh
```

That's it. P2P listens on port **8228**. The FiberFlow API listens on port **3000**.

## Merchant payments

FiberFlow is a payment gateway on Fiber. Merchants integrate via the API, redirect customers to the checkout page, and fulfill orders on `invoice.paid` webhooks.

**Integration guide:** [`docs/MERCHANT_INTEGRATION.md`](docs/MERCHANT_INTEGRATION.md)

**Example webhook receiver:** [`examples/node-webhook/`](examples/node-webhook/)

### Production domains

| Subdomain | Purpose |
|-----------|---------|
| `app.example.com` | Dashboard |
| `api.example.com` | Merchant API |
| `checkout.example.com` | Customer payment page |

## FiberFlow API

The API container shares the Fiber container's network, so it can reach Fiber RPC on `127.0.0.1:8227` without exposing RPC to the host.

```bash
curl http://localhost:3000/health
curl http://localhost:3000/v1/invoices \
  -H "Authorization: Bearer ffg_YOUR_API_KEY"
```

Fiber RPC is not exposed publicly — only the API port is.

### Local development (without Docker)

**FiberFlow server** (Fiber RPC + Drizzle + Better Auth):

```bash
cd server
cp .env.example .env   # set DATABASE_URL, BETTER_AUTH_SECRET
bun install
bun run db:push
bun run dev
```

**Frontend** (runs on port 5173):

```bash
cd frontend
cp .env.example .env.local   # VITE_API_URL=http://localhost:3000
bun install
bun run dev
```

## Network

Default is testnet. For mainnet, set in `.env`:

```
FIBER_NETWORK=mainnet
```

Edit `config/testnet.yml` or `config/mainnet.yml` to customize your node (e.g. announce your public IP), then restart with `./start.sh` to apply changes.

## Useful commands

```bash
docker compose logs -f                    # follow logs
docker compose logs -f gateway            # API logs only
docker compose exec fiber fnn-cli info    # node info
docker compose exec fiber fnn-cli channel list_channels
docker compose down                       # stop
```

## Data

All node data lives in `./data` (gitignored). Back it up before upgrades.

## Upgrading

When a new [Fiber release](https://github.com/nervosnetwork/fiber/releases) is published:

1. **Close open channels** (recommended — protocol/storage can change between versions).
2. **Back up** `./data`.
3. **Bump the image tag** in `.env`:

   ```
   FIBER_VERSION=0.9.0-rc4
   ```

   Check available tags at [nervos/fiber on Docker Hub](https://hub.docker.com/r/nervos/fiber/tags).

4. **Pull and restart:**

   ```bash
   docker compose down
   docker compose pull
   ./start.sh
   ```

Your config (`config/testnet.yml` or `config/mainnet.yml`) and wallet key (`data/ckb/key`) stay as-is — only the container image changes. Newer Fiber versions migrate the database automatically on startup.

If you also `git pull` this repo, you may get updated config templates — review `config/*.yml` for any new options, but you may need to rebuild the API with `docker compose up -d --build`.
