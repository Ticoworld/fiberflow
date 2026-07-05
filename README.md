# fiberflow-gateway

Run a [Fiber Network Node](https://github.com/nervosnetwork/fiber) with Docker in a few steps.

## Quick start

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) installed.

```bash
git clone <this-repo>
cd fiberflow-gateway

cp .env.example .env          # set FIBER_SECRET_KEY_PASSWORD
mkdir -p data/ckb
# put your CKB private key in data/ckb/key

./start.sh
```

That's it. P2P listens on port **8228**.

## Network

Default is testnet. For mainnet, set in `.env`:

```
FIBER_NETWORK=mainnet
```

Edit `config/testnet.yml` or `config/mainnet.yml` to customize your node (e.g. announce your public IP), then restart with `./start.sh` to apply changes.

## Useful commands

```bash
docker compose logs -f                    # follow logs
docker compose exec fiber fnn-cli info    # node info
docker compose exec fiber fnn-cli channel list_channels
docker compose down                       # stop
```

RPC runs on `127.0.0.1:8227` inside the container — use `docker compose exec` to reach it.

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

If you also `git pull` this repo, you may get updated config templates — review `config/*.yml` for any new options, but you don't need to rebuild anything.
