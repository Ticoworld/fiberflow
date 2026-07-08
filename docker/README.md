# Docker notes

Production Fiber + API deployment uses the root [`docker-compose.yml`](../docker-compose.yml):

- **fiber** — official `nervos/fiber` image
- **gateway** — FiberFlow API (`../server/Dockerfile`), shares Fiber's network namespace

Run from the repo root: `./start.sh`

Fiber RPC (`8227`) stays internal. Only P2P (`8228`) and the API (`GATEWAY_PORT`, default `3000`) are published.

Guides: [`docs/SELF_HOSTING.md`](../docs/SELF_HOSTING.md) (local), [`docs/DEPLOY.md`](../docs/DEPLOY.md) (VPS + public Fiber address + frontend).

This directory is reserved for optional Fiber image customizations. The default setup does not require files here.
