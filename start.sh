#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env — set FIBER_SECRET_KEY_PASSWORD, then run ./start.sh again."
    exit 1
fi

# shellcheck disable=SC1091
. ./.env

if [ "${FIBER_SECRET_KEY_PASSWORD:-}" = "" ] || [ "$FIBER_SECRET_KEY_PASSWORD" = "change-me" ]; then
    echo "Set FIBER_SECRET_KEY_PASSWORD in .env before starting."
    exit 1
fi

mkdir -p data/ckb

if [ ! -f data/ckb/key ]; then
    echo "Missing CKB private key at data/ckb/key"
    echo "See https://github.com/nervosnetwork/fiber#build-and-run-a-testnet-node"
    exit 1
fi

NETWORK="${FIBER_NETWORK:-testnet}"
CONFIG_SRC="config/${NETWORK}.yml"

if [ ! -f "$CONFIG_SRC" ]; then
    echo "Missing config: $CONFIG_SRC (set FIBER_NETWORK to testnet or mainnet in .env)"
    exit 1
fi

cp "$CONFIG_SRC" data/config.yml

docker compose up -d
echo "Node started. Logs: docker compose logs -f"
echo "CLI:    docker compose exec fiber fnn-cli info"
