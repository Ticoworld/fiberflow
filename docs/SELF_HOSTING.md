# Get FiberFlow running

Follow these steps **in order**. When you finish, you can accept Fiber payments from your online store (on testnet first).

**What you will have**

1. FiberFlow running on your computer
2. A payment channel so customers can actually pay you
3. The landing page, a dashboard login, API key, and webhook for your store

**Who this guide is for**

You should be comfortable opening a terminal and pasting commands. You do **not** need to be a blockchain expert. If a step asks for Docker, Bun, or Neon, use the short install notes below — each links to the official installer.

On your laptop you do **not** need a public IP — your node connects out to the Fiber network. On a VPS, you should announce your public address so other nodes can reach you — see [DEPLOY.md](DEPLOY.md).

If FiberFlow is already running and you only need to wire up a store, skip to [Connect your store](#8-connect-your-store) or open [MERCHANT_INTEGRATION.md](MERCHANT_INTEGRATION.md).

---



## Plain-language background (30 seconds)


| Term                | Meaning                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **CKB**             | The coin on Nervos. You need some **testnet** CKB (fake money for testing) to open a channel.                  |
| **Fiber**           | A fast payment network on top of CKB (similar idea to Lightning on Bitcoin).                                   |
| **Payment channel** | A funded link between your Fiber node and another node. **Without an open channel, checkout cannot complete.** |
| **FiberFlow**       | Your self-hosted Stripe-like layer: dashboard, invoices, checkout page, webhooks.                              |


Start on **testnet**. Switch to mainnet only after a full test payment works.

---



## 0. Clone the project

```bash
git clone https://github.com/chukwuma619/fiberflow.git
cd fiberflow
```

All later commands assume you are in this folder (the repo root), unless a step says `cd server` or `cd frontend`.

---



## What you need


| Item                                                           | Why                                       | How to get it                                                                                                                            |
| -------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [Docker](https://docs.docker.com/get-docker/)                  | Runs the Fiber node and FiberFlow API     | Install **Docker Desktop** (Mac/Windows) or Docker Engine (Linux). Open Docker and wait until it says it is running before you continue. |
| [Bun](https://bun.sh)                                          | Database setup + dashboard                | On Mac/Linux: `curl -fsSL https://bun.sh/install | bash` then open a **new** terminal.                                                   |
| A free [Neon](https://neon.tech) Postgres database             | Stores accounts, invoices, webhooks       | Sign up → create a project → copy the connection string (`postgresql://…`). Use the **pooled** URL if Neon shows one.                    |
| `[ckb-cli](https://github.com/nervosnetwork/ckb-cli/releases)` | Creates your node wallet key              | Download the release for your OS, unzip it, and put `ckb-cli` on your PATH (or run it via the full path to the binary).                  |
| About **100,000 testnet CKB**                                  | Funds your node so you can open a large enough channel | [faucet.nervos.org](https://faucet.nervos.org) after you have an address (step 1) — request multiple times if needed |


**Optional but useful later:** a Fiber-capable wallet so *you* can act as a test customer and pay a test invoice. See [§7 Test payment](#7-make-a-test-payment).

---



## 1. Create your wallet key

FiberFlow uses a CKB private key for the payment node. Keep this file private — it controls funds.

### 1.1 Install `ckb-cli`

1. Open [ckb-cli releases](https://github.com/nervosnetwork/ckb-cli/releases).
2. Download the archive for your machine (e.g. macOS arm64, Linux x86_64).
3. Unzip it. You should see a `ckb-cli` binary.
4. In a terminal, from the unzipped folder, check it works:

```bash
./ckb-cli --version
```

If that prints a version, you can use `./ckb-cli` in the commands below (or move it somewhere on your PATH and use `ckb-cli`).

### 1.2 Create and export a key

From the **FiberFlow repo root**:

```bash
ckb-cli account new
```

You will be asked for a password (for the local keystore). Save it somewhere safe.

The output includes a `lock_arg` that looks like a long hex string (often starting with `0x`). Copy it.

Example shape (yours will differ):

```text
lock_arg: 0x1234abcd...
```

Export the key (replace with **your** lock_arg):

```bash
ckb-cli account export --lock-arg <YOUR_LOCK_ARG> --extended-privkey-path ./exported-key
```

Enter the same password when asked. Then:

```bash
mkdir -p data/ckb
head -n 1 ./exported-key > data/ckb/key
chmod 600 data/ckb/key
rm ./exported-key
```

`data/ckb/key` must be **one line**, **64 hex characters**, **no** `0x`.

Check the address (you will send testnet CKB here):

```bash
ckb-cli util key-info --privkey-path data/ckb/key
```

Copy the **testnet address** from the output (it usually starts with `ckt…`). You need it for the faucet in step 4.

**Rules**

- Never commit `data/ckb/key` or `.env` to git  
- Remember the password you set in the next step (`FIBER_SECRET_KEY_PASSWORD`) — it is separate from the `ckb-cli` keystore password  
- Back up the whole `./data` folder regularly

---



## 2. Configure FiberFlow



### 2.1 Root `.env` (Fiber node)

```bash
cp .env.example .env
```

Open `.env` in a text editor and set:

```bash
FIBER_SECRET_KEY_PASSWORD=choose-a-strong-password
FIBER_NETWORK=testnet
```

Do not leave the password as `change-me` — `./start.sh` will refuse to start.

### 2.2 API `server/.env`

```bash
cp server/.env.example server/.env
```

In `server/.env`, set at least:


| Variable             | What to put                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Your Neon (or Postgres) connection string                                                                                         |
| `BETTER_AUTH_SECRET` | Run `bunx @better-auth/cli secret` and paste the result                                                                           |
| `BETTER_AUTH_URL`    | `http://localhost:3000` for local use                                                                                             |
| `CORS_ORIGIN`        | `http://localhost:5173` for local use (production: apex site + checkout, e.g. `https://example.com,https://checkout.example.com`) |
| `PAYMENT_APP_URL`    | `http://localhost:5173` for local use                                                                                             |
| `FIBER_NETWORK`      | `testnet` (same as root `.env`)                                                                                                   |


Generate the auth secret:

```bash
bunx @better-auth/cli secret
```



### 2.3 Create the database tables

This step is required. Without it, the API cannot start correctly.

```bash
cd server
bun install
bun run db:push
cd ..
```

If `db:push` fails, double-check `DATABASE_URL` and that your laptop can reach Neon (no VPN blocking it).

---



## 3. Start FiberFlow

From the repo root:

```bash
./start.sh
```

The first run downloads Docker images and may take several minutes.

Check that it is up:

```bash
curl http://localhost:3000/health
# {"status":"ok"}

docker compose exec fiber fnn-cli info
```

You should see node info including a `pubkey` and your network (`testnet`).


| Port     | What it is                                  |
| -------- | ------------------------------------------- |
| **3000** | FiberFlow API (the dashboard talks to this) |
| **8228** | Fiber network connection                    |
| **8227** | Internal only — do not expose               |


If something fails, see [If something goes wrong](#if-something-goes-wrong).

---



## 4. Fund the node and open a channel

Invoices alone are not enough. Your node must be funded and connected to the Fiber network with an open channel. Until then, customers cannot complete payments.

### 4.1 Send testnet CKB to your node

1. Copy the **testnet address** from `ckb-cli util key-info --privkey-path data/ckb/key` (or look for an address in `fnn-cli info`).
2. Open [faucet.nervos.org](https://faucet.nervos.org), paste the address, and request CKB. Aim for about **100,000 CKB** (use the faucet more than once if each drip is smaller). You need enough to open the channel below and still keep a little spare for fees.  
3. Confirm the funds arrived before continuing:

```bash
# Address balance on the CKB testnet explorer
# https://explorer.nervos.org — paste your ckt… address
```

You can also re-check after the node has synced:

```bash
docker compose exec fiber fnn-cli info
```

Wait until the explorer (or node) shows a balance before opening a channel. Faucet credits can take a minute or two.

### 4.2 Connect to a public Fiber node

Public nodes change over time. Use one of these testnet peers (or check [fiber.world Network Resources](https://www.fiber.world/docs/quick-start/network-resources) if a command fails):


| Name   | Pubkey                                                               |
| ------ | -------------------------------------------------------------------- |
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

Public nodes usually accept channels of **at least 499 CKB**. A tiny channel (e.g. 500 CKB) leaves almost no room for real checkout amounts after reserves — open something large enough to receive meaningful payments.

This opens **50,000 CKB** (amount is in shannons: `1 CKB = 100000000`). You can use `2000000000000` (20,000 CKB) or `10000000000000` (100,000 CKB) instead if you prefer; keep faucet balance above the funding amount.

```bash
docker compose exec fiber fnn-cli channel open_channel \
  --pubkey "$PEER_PUBKEY" \
  --funding-amount 5000000000000 \
  --public true
```

Wait a few minutes, then check:

```bash
docker compose exec fiber fnn-cli channel list_channels
```

Look for state `ChannelReady`. After that, wait a few more minutes so the network can learn your channel. Paying too early can fail even when the channel looks ready.

### 4.4 What “ready to accept payments” means


| Check          | Good sign                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------ |
| Peer connected | `peer list_peers` shows your peer                                                          |
| Channel ready  | `list_channels` shows `ChannelReady`                                                       |
| Can receive    | Prefer a channel with some **remote** balance, then confirm with a small real test payment |


You do not need a special RUSD channel for normal FiberFlow checkout.

---



## 5. Open the app (landing + dashboard)

```bash
cd frontend
cp .env.example .env
# Confirm VITE_API_URL=http://localhost:3000
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173):

1. You should see the **FiberFlow landing page** (Sign in / Get started)
2. Create an account, then create a store (name + slug)
3. **Settings** → create an API key (`ffg_...`) — copy it once
4. **Webhooks** → add your store’s webhook URL (for local testing, see [examples/node-webhook/](../examples/node-webhook/))
5. Create a small test invoice and open the payment link

If you are already signed in, `/` sends you straight to the dashboard.

**Production (VPS):** put Fiber + API + the frontend on a server, open Fiber port 8228, set `announced_addrs` — full walkthrough: **[DEPLOY.md](DEPLOY.md)**.

---



## 6. (Optional) Local webhook receiver

To see `invoice.paid` without a live store:

```bash
cd examples/node-webhook
FIBERFLOW_WEBHOOK_SECRET=whsec_YOUR_SECRET bun run server.js
```

In the dashboard, set the webhook URL to `http://127.0.0.1:8787/webhooks/fiberflow` (same machine as the API). Details: [examples/node-webhook/README.md](../examples/node-webhook/README.md).

---



## 7. Make a test payment

Until a small invoice is **paid**, you have not finished setup.

1. In the dashboard, create an invoice for a tiny amount (for example `$0.10`).
2. Open the **payment link** (checkout page). You should see the amount, a QR code, and a Fiber payment address.
3. Pay it with a **Fiber-compatible wallet** that can send on **testnet**.

**Finding a wallet:** Fiber wallets are still evolving. Start from [Fiber Network Resources](https://www.fiber.world/docs/quick-start/network-resources) and the [Fiber docs](https://www.fiber.world/docs/quick-start/run-a-node). For CKB testnet funds and explorers, use the [Nervos faucet](https://faucet.nervos.org) and [testnet explorer](https://explorer.nervos.org/aggron). JoyID ([testnet.joyid.dev](https://testnet.joyid.dev/)) is commonly used for CKB testnet; confirm your wallet can **pay a Fiber invoice / address** before relying on it for the test.

1. Watch the invoice status become **paid**, and confirm your webhook logs `invoice.paid` if you set one up.

If payment fails, wait a few more minutes after `ChannelReady`, confirm you are on **testnet** everywhere, and re-check `list_channels`.

---



## 8. Connect your store

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

There is no Shopify/WooCommerce plugin yet. Any site that can call an HTTPS API and receive a webhook can integrate. If you are not a developer, give that guide plus your API key and webhook secret to whoever builds your store checkout.

---



## You’re ready when…

- [ ] `http://localhost:3000/health` returns OK  
- [ ] `fnn-cli info` works  
- [ ] A peer is connected and a channel is `ChannelReady`  
- [ ] You can sign in to the dashboard and create a store  
- [ ] A test invoice payment completes  
- [ ] Your webhook receives `invoice.paid` (if configured)  
- [ ] `./data` is backed up  

**Next:** deploy for real customers → [DEPLOY.md](DEPLOY.md). Then wire the store → [MERCHANT_INTEGRATION.md](MERCHANT_INTEGRATION.md).

---



## If something goes wrong


| Problem                           | Fix                                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `./start.sh` says missing key     | Create `data/ckb/key` (step 1)                                                                                                     |
| `./start.sh` says password        | Set `FIBER_SECRET_KEY_PASSWORD` in `.env` (not `change-me`)                                                                        |
| Docker errors / can’t pull images | Start Docker Desktop and wait until it is running; check internet                                                                  |
| API won’t start                   | Check `DATABASE_URL`, run `bun run db:push` in `server/`, confirm Postgres is reachable                                            |
| Can’t create invoices (`502`)     | Wait for Fiber to finish starting; check internet (price feed)                                                                     |
| Invoice never becomes paid        | Channel not ready, or wait a few minutes after opening; confirm testnet vs mainnet match                                           |
| `open_channel` fails              | Fund well above the channel size (e.g. ~100,000 CKB for a 50,000 CKB channel); connect the peer first; confirm balance on the explorer |
| `connect_peer` fails              | Try the other public pubkey, or refresh peers from [Network Resources](https://www.fiber.world/docs/quick-start/network-resources) |
| Browser CORS errors               | Put your site origin in `CORS_ORIGIN` (local: `http://localhost:5173`; production: apex + checkout)                                |
| Wrong payment link host           | Set `PAYMENT_APP_URL` (and `VITE_PAYMENT_APP_URL` for production builds)                                                           |
| `ckb-cli: command not found`      | Install from [releases](https://github.com/nervosnetwork/ckb-cli/releases) and use `./ckb-cli` from the unzipped folder            |


---



## More detail (optional)

- Deploy on a VPS (Docker, public Fiber address, frontend, HTTPS): [DEPLOY.md](DEPLOY.md)  
- Store API + webhooks: [MERCHANT_INTEGRATION.md](MERCHANT_INTEGRATION.md)

