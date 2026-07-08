# Docker notes

Production Fiber + API deployment uses the root [`docker-compose.yml`](../docker-compose.yml):

- **fiber** — official `nervos/fiber` image
- **gateway** — FiberFlow API (`../server/Dockerfile`), shares Fiber's network namespace

Run from the repo root: `./start.sh`

This directory is reserved for optional Fiber image customizations. The default setup does not require files here.
