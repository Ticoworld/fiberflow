# Get FiberFlow running

Follow these steps in order. When you finish, you can accept Fiber payments from your online store.

**What you will have**

1. FiberFlow running on your computer or server  
2. A payment channel so customers can actually pay you  
3. A dashboard login, API key, and webhook for your store  

On your laptop you do **not** need a public IP — your node connects out to the Fiber network. On a VPS, you should announce your public address so other nodes can reach you — see [DEPLOY.md](DEPLOY.md).

If FiberFlow is already running and you only need to wire up a store, skip to [Connect your store](#6-connect-your-store) or open [MERCHANT_INTEGRATION.md](MERCHANT_INTEGRATION.md).

---

## What you need

| Item | Why |
|------|-----|
| [Docker](https://docs.docker.com/get-docker/) | Runs the Fiber node and FiberFlow API |
| A free [Neon](https://neon.tech) Postgres database (or any Postgres) | Stores your account, invoices, and webhooks |
| [Bun](https://bun.sh) | Runs the dashboard on your machine |
| About **10,000 testnet CKB** | Funds your node so you can open a channel (use the [testnet faucet](https://faucet.nervos.org)) |

Start on **testnet**. Switch to mainnet only after a full test payment works.

---

## 1. Create your wallet key

FiberFlow uses a CKB private key for the payment node. Keep this file private — it controls funds.

Install [`ckb-cli`](https://github.com/nervosnetwork/ckb-cli/releases), then:

```bash
ckb-cli account new
# Save the lock_arg from the output

ckb-cli account export --lock-arg <YOUR_LOCK_ARG> --extended-privkey-path ./exported-key

mkdir -p data/ckb
head -n 1 ./exported-key > data/ckb/key
chmod 600 data/ckb/key
rm ./exported-key
```

`data/ckb/key` must be **one line**, **64 hex characters**, **no `0x`**.

Check the address (you will send testnet CKB here):

```bash
ckb-cli util key-info --privkey-path data/ckb/key
```

**Rules**

- Never commit `data/ckb/key` or `.env` to git  
- Remember the password you set in the next step  
- Back up the whole `./data` folder regularly  

---

## 2. Configure FiberFlow

```bash
cp .env.example .env
```

In `.env`, set:

```bash
FIBER_SECRET_KEY_PASSWORD=choose-a-strong-password
FIBER_NETWORK=testnet
```

Then:

```bash
cp server/.env.example server/.env
```

In `server/.env`, set at least:

| Variable | What to put |
|----------|-------------|
| `DATABASE_URL` | Your Neon (or Postgres) connection string |
| `BETTER_AUTH_SECRET` | Run `bunx @better-auth/cli secret` and paste the result |
| `BETTER_AUTH_URL` | `http://localhost:3000` for local use |
| `CORS_ORIGIN` | `http://localhost:5173` for local use |
| `PAYMENT_APP_URL` | `http://localhost:5173` for local use |
| `FIBER_NETWORK` | `testnet` (same as root `.env`) |

Create the database tables:

```bash
cd server
bun install
bun run db:push
cd ..
```

---

## 3. Start FiberFlow

From the repo root:

```bash
./start.sh
```

Check that it is up:

```bash
curl http://localhost:3000/health
# {"status":"ok"}

docker compose exec fiber fnn-cli info
```

You should see node info including a `pubkey` and your network (`testnet`).

| Port | What it is |
|------|------------|
| **3000** | FiberFlow API (open this in a browser via the dashboard later) |
| **8228** | Fiber network connection |
| **8227** | Internal only — do not expose |

---

## 4. Fund the node and open a channel

Invoices alone are not enough. Your node must be funded and connected to the Fiber network with an open channel. Until then, customers cannot complete payments.

### 4.1 Send testnet CKB to your node

1. Copy the address from `ckb-cli util key-info` (or from `fnn-cli info`).  
2. Get free testnet CKB from [faucet.nervos.org](https://faucet.nervos.org). Aim for about **10,000 CKB**.  
3. Wait until the balance shows up before continuing.

### 4.2 Connect to a public Fiber node

Public nodes change over time. Use one of these testnet peers (or check [fiber.world Network Resources](https://www.fiber.world/docs/quick-start/network-resources) if a command fails):

| Name | Pubkey |
|------|--------|
| bottle | `02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71` |
| bracer | `0291a6576bd5a94bd74b27080a48340875338fff9f6d6361fe6b8db8d0d1912fcc` |

```bash
export PEER_PUBKEY=02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71

docker compose exec fiber fnn-cli peer connect_peer --pubkey "$PEER_PUBKEY"
docker compose exec fiber fnn-cli peer list_peers
```

You should see the peer listed. If connect fails, try the other pubkey, or add an address:

```bash
docker compose exec fiber fnn-cli peer connect_peer \
  --pubkey "$PEER_PUBKEY" \
  --address "/dns4/bottle.fiber.channel/tcp/443/wss/p2p/QmXen3eUHhywmutEzydCsW4hXBoeVmdET2FJvMX69XJ1Eo"
```

If `fnn-cli` errors with `503`, run:

```bash
export NO_PROXY=127.0.0.1,localhost
```

### 4.3 Open a channel

Public nodes usually accept channels of **at least 499 CKB**. This opens **500 CKB** (amount is in shannons: `1 CKB = 100000000`):

```bash
docker compose exec fiber fnn-cli channel open_channel \
  --pubkey "$PEER_PUBKEY" \
  --funding-amount 50000000000 \
  --public true
```

Wait a few minutes, then check:

```bash
docker compose exec fiber fnn-cli channel list_channels
```

Look for state **`ChannelReady`**. After that, wait a few more minutes so the network can learn your channel. Paying too early can fail even when the channel looks ready.

### 4.4 What “ready to accept payments” means

| Check | Good sign |
|-------|-----------|
| Peer connected | `peer list_peers` shows your peer |
| Channel ready | `list_channels` shows `ChannelReady` |
| Can receive | Prefer a channel with some **remote** balance, then confirm with a small real test payment |

You do not need a special RUSD channel for normal FiberFlow checkout.

---

## 5. Open the dashboard

```bash
cd frontend
cp .env.example .env.local
# VITE_API_URL=http://localhost:3000
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173):

1. Sign up with email and password  
2. Create a store (name + slug)  
3. **Settings** → create an API key (`ffg_...`) — copy it once  
4. **Webhooks** → add your store’s webhook URL  
5. Create a small test invoice and open the payment link  

**Production (VPS):** put Fiber + API + dashboard on a server, open Fiber port 8228, set `announced_addrs`, and deploy the frontend — full walkthrough: **[DEPLOY.md](DEPLOY.md)**.

---

## 6. Connect your store

Your store only needs three things:

1. **Create invoice** — your backend calls FiberFlow with the API key  
2. **Redirect** — send the customer to `payment_url`  
3. **Fulfill** — when you receive `invoice.paid` on your webhook, mark the order paid  

```text
Customer checks out on your site
        → your server creates an invoice
        → customer pays on FiberFlow checkout
        → FiberFlow tells your webhook “paid”
        → you ship / unlock the order
```

Step-by-step API examples, webhook signature checks, and a sample server: **[MERCHANT_INTEGRATION.md](MERCHANT_INTEGRATION.md)** and **[examples/node-webhook/](../examples/node-webhook/)**.

There is no Shopify/WooCommerce plugin yet. Any site that can call an HTTPS API and receive a webhook can integrate.

---

## You’re ready when…

- [ ] `http://localhost:3000/health` returns OK  
- [ ] `fnn-cli info` works  
- [ ] A peer is connected and a channel is `ChannelReady`  
- [ ] You can sign in to the dashboard and create a store  
- [ ] A test invoice payment completes  
- [ ] Your webhook receives `invoice.paid`  
- [ ] `./data` is backed up  

---

## If something goes wrong

| Problem | Fix |
|---------|-----|
| `./start.sh` says missing key | Create `data/ckb/key` (step 1) |
| `./start.sh` says password | Set `FIBER_SECRET_KEY_PASSWORD` in `.env` |
| API won’t start | Check `DATABASE_URL` and that Postgres is reachable |
| Can’t create invoices (`502`) | Wait for Fiber to finish starting; check internet (price feed) |
| Invoice never becomes paid | Channel not ready, or wait a few minutes after opening; confirm testnet vs mainnet match |
| `open_channel` fails | Fund at least ~500 CKB; connect the peer first |
| `connect_peer` fails | Try the other public pubkey, or refresh peers from [Network Resources](https://www.fiber.world/docs/quick-start/network-resources) |
| Browser CORS errors | Put your dashboard URL in `CORS_ORIGIN` |
| Wrong payment link host | Set `PAYMENT_APP_URL` (and `VITE_PAYMENT_APP_URL` for production builds) |

---

## More detail (optional)

- Deploy on a VPS (Docker, public Fiber address, frontend, HTTPS): [DEPLOY.md](DEPLOY.md)  
- Store API + webhooks: [MERCHANT_INTEGRATION.md](MERCHANT_INTEGRATION.md)  

