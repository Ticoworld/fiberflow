# Deploy FiberFlow on a VPS

This guide puts FiberFlow on a server so your store can accept Fiber payments in production.

**You will end up with**

| Piece | What it is |
|-------|------------|
| `https://api.example.com` | FiberFlow HTTP API (auth, invoices, webhooks) |
| `https://app.example.com` | Merchant dashboard |
| `https://checkout.example.com` | Customer payment page |
| VPS public IP, port **8228** | Fiber P2P (not a website — other Fiber nodes connect here) |

The Fiber node and API run together in Docker on the VPS. The dashboard/checkout is a separate container (or process). Replace `example.com` with your domain everywhere below.

---

## What you need

| Item | Notes |
|------|--------|
| A VPS | Ubuntu 22.04+ is a common choice. Give it enough RAM for Docker (plan on **2 GB+**) |
| A public IPv4 address | Needed if you want other Fiber nodes to dial **your** node (see §2) |
| A domain | Point DNS at the VPS |
| Docker + Docker Compose | Install on the VPS |
| Bun | Needed for `db:push`, and if you build the frontend without Docker |
| Postgres | e.g. [Neon](https://neon.tech) (can be off-VPS) |
| Testnet CKB (or mainnet CKB) | To fund the node and open a channel |

Open these ports on the VPS firewall / cloud security group:

| Port | Why |
|------|-----|
| **22** | SSH |
| **80 / 443** | Website (HTTPS) |
| **8228/tcp** | Fiber P2P — required if you announce a public Fiber address |

Do **not** open Fiber RPC port **8227** to the internet (Docker already keeps it internal).

---

## 1. Prepare the VPS

SSH in, then install Docker:

```bash
# Ubuntu example
sudo apt update
sudo apt install -y ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# log out and back in so docker works without sudo
```

Clone the repo:

```bash
git clone https://github.com/chukwuma619/fiberflow.git
cd fiberflow
```

Create your wallet key on the VPS (or copy a key you already made — keep it secret):

```bash
mkdir -p data/ckb
# Put one line: 64 hex characters, no 0x
nano data/ckb/key
chmod 600 data/ckb/key
```

Full key steps: [SELF_HOSTING.md](SELF_HOSTING.md#1-create-your-wallet-key).

---

## 2. Make your Fiber node publicly reachable (`announced_addrs`)

**Two different ideas:**

| Goal | Do you need `announced_addrs` + open 8228? |
|------|--------------------------------------------|
| Accept store payments via a channel to a public relay | **Not strictly** — you can outbound-connect and open a channel (same as local setup) |
| Let other nodes dial **your** node (public / routing-style) | **Yes** — set `announced_addrs` and open TCP **8228** |

For a store on a VPS, announcing your address is still a good idea: peers can reach you reliably. This section is for that.

1. Find your VPS public IP (cloud panel, or):

```bash
curl -4 ifconfig.me
# example: 203.0.113.10
```

2. Edit the config for your network:

- Testnet → `config/testnet.yml`
- Mainnet → `config/mainnet.yml`

Uncomment / set `announced_addrs` (keep the quotes):

```yaml
fiber:
  listening_addr: "/ip4/0.0.0.0/tcp/8228"
  announce_listening_addr: true
  announced_addrs:
    - "/ip4/203.0.113.10/tcp/8228"   # ← your real public IP
```

Optional name (shows up in node info / explorers):

```yaml
  announced_node_name: "my-store-fiber"
```

3. Allow **inbound TCP 8228** on the VPS firewall and your cloud security group.

`./start.sh` copies `config/<network>.yml` → `data/config.yml` on every start. Edit the file under `config/`, then restart — do not rely on editing only `data/config.yml`.

---

## 3. Configure environment files

### Root `.env` (Fiber + Docker)

```bash
cp .env.example .env
```

```bash
FIBER_SECRET_KEY_PASSWORD=use-a-long-random-password
FIBER_NETWORK=testnet          # or mainnet
FIBER_VERSION=0.9.0-rc3
GATEWAY_PORT=3000
```

### `server/.env` (API)

```bash
cp server/.env.example server/.env
```

```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...         # bunx @better-auth/cli secret
BETTER_AUTH_URL=https://api.example.com
CORS_ORIGIN=https://app.example.com,https://checkout.example.com
PAYMENT_APP_URL=https://checkout.example.com
FIBER_NETWORK=testnet          # must match root .env
PORT=3000
```

`PAYMENT_APP_URL` is what the **API** puts into invoice `payment_url` values. The frontend also needs matching `VITE_*` values at build time (step 5).

### Database tables

`db:push` needs Bun. Either install Bun on the VPS, or run this from your laptop against the same `DATABASE_URL`:

```bash
cd server
bun install
bun run db:push
cd ..
```

(The API Docker image does **not** run migrations for you.)

---

## 4. Start Fiber + API with Docker

```bash
./start.sh
```

This starts:

- **fiber** — P2P on host port **8228**, RPC only inside the container on **8227**
- **gateway** — FiberFlow API on host port **3000** (shares the fiber container network)

Check:

```bash
curl http://127.0.0.1:3000/health
# {"status":"ok"}

docker compose exec fiber fnn-cli info
```

If you set `announced_addrs`, look in the `info` output for an address containing your public IP and `8228`.

From another network (or a port-check tool), confirm **TCP 8228** reaches your VPS IP.

Then fund the node and open a channel — same steps as local: [SELF_HOSTING.md §4](SELF_HOSTING.md#4-fund-the-node-and-open-a-channel).

```bash
docker compose logs -f
docker compose exec fiber fnn-cli peer list_peers
docker compose exec fiber fnn-cli channel list_channels
```

---

## 5. Deploy the frontend (dashboard + checkout)

The dashboard and checkout are the **same app**. One build can serve both hostnames.

`VITE_API_URL` and `VITE_PAYMENT_APP_URL` are baked in at **build** time. Rebuild if you change domains.

### Option A — Docker on the VPS (recommended)

Build **on the VPS** (or any Linux machine matching the server CPU) so the image matches the server:

```bash
cd frontend

docker build -t fiberflow-web \
  --build-arg VITE_API_URL=https://api.example.com \
  --build-arg VITE_PAYMENT_APP_URL=https://checkout.example.com \
  .

docker run -d \
  --name fiberflow-web \
  --restart unless-stopped \
  -p 127.0.0.1:4173:3000 \
  fiberflow-web
```

Inside the container the app listens on **3000**. We publish it as **4173** on localhost so it does not clash with the API on 3000. Caddy/nginx will proxy to 4173.

### Option B — Bun on the VPS

```bash
cd frontend
cp .env.example .env.production
```

Put this in `.env.production`:

```bash
VITE_API_URL=https://api.example.com
VITE_PAYMENT_APP_URL=https://checkout.example.com
```

```bash
bun install
bun run build
PORT=4173 HOST=0.0.0.0 bun run start
```

Keep it running with systemd or PM2. Example:

```bash
cd frontend
PORT=4173 HOST=0.0.0.0 pm2 start .output/server/index.mjs --name fiberflow-web
pm2 save
```

---

## 6. Point DNS at the VPS

Create **A records** (or AAAA for IPv6) for:

| Hostname | Points to |
|----------|-----------|
| `api.example.com` | VPS public IP |
| `app.example.com` | VPS public IP |
| `checkout.example.com` | VPS public IP |

Wait until DNS resolves before requesting HTTPS certificates.

---

## 7. HTTPS reverse proxy (Caddy)

Install [Caddy](https://caddyserver.com/docs/install). Example `/etc/caddy/Caddyfile`:

```caddy
api.example.com {
    reverse_proxy 127.0.0.1:3000
}

app.example.com {
    reverse_proxy 127.0.0.1:4173
}

checkout.example.com {
    reverse_proxy 127.0.0.1:4173
}
```

```bash
sudo systemctl reload caddy
```

With ports **80/443** open and DNS correct, Caddy can obtain certificates automatically.

Nginx works the same way: proxy those three hostnames to `127.0.0.1:3000` (API) and `127.0.0.1:4173` (frontend), plus TLS (e.g. Certbot).

---

## 8. Verify everything

| Check | How |
|-------|-----|
| API health | `curl https://api.example.com/health` → `{"status":"ok"}` |
| Fiber listening | `docker compose exec fiber fnn-cli info` works |
| Public dial (if you announced) | External check that `YOUR_IP:8228` accepts TCP |
| Dashboard | `https://app.example.com` → sign up / log in |
| Payment links | New invoice `payment_url` starts with `https://checkout.example.com/` |
| Channel | `list_channels` shows `ChannelReady` |
| Money path | Small test payment completes; webhook gets `invoice.paid` |

---

## After deploy: connect your store

1. Dashboard **Settings** → create an API key  
2. **Webhooks** → add your store’s HTTPS webhook URL  
3. [MERCHANT_INTEGRATION.md](MERCHANT_INTEGRATION.md)  

---

## Updating later

**API + Fiber**

```bash
cd fiberflow
# edit config/*.yml or .env if needed
docker compose pull
./start.sh
```

Before upgrading Fiber image versions: close channels and back up `./data` (see root README).

**Frontend**

Rebuild with the same `VITE_*` URLs, then restart the container or `bun run start` process.

---

## Security checklist

- [ ] Fiber RPC **8227** is not published to the internet  
- [ ] `data/ckb/key` and `.env` files are not in git  
- [ ] `FIBER_SECRET_KEY_PASSWORD` is strong and backed up  
- [ ] `./data` is backed up regularly  
- [ ] Webhook URLs use HTTPS  
- [ ] Firewall: 22, 80, 443, and 8228 only as needed  

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Peers cannot dial you | Set `announced_addrs` to the real public IP; open TCP **8228**; `./start.sh` again |
| `announced_addrs` ignored | You edited only `data/config.yml` — edit `config/testnet.yml` or `config/mainnet.yml`, then `./start.sh` |
| Login works then session lost | `BETTER_AUTH_URL=https://api.example.com`; `CORS_ORIGIN` includes app + checkout |
| CORS on checkout | Add checkout origin to `CORS_ORIGIN`, restart API container |
| Wrong payment link host | Set API `PAYMENT_APP_URL` **and** rebuild frontend with `VITE_PAYMENT_APP_URL` |
| Frontend still calls localhost | Rebuild — `VITE_*` values are fixed at build time |
| `502` creating invoices | Fiber/API logs: `docker compose logs`; check Fiber is up and the price feed can reach the internet |
| `db:push` missing | Install Bun (or run push from your laptop with the same `DATABASE_URL`) |

---

## Related

- Local setup + channels: [SELF_HOSTING.md](SELF_HOSTING.md)  
- Store API + webhooks: [MERCHANT_INTEGRATION.md](MERCHANT_INTEGRATION.md)  
