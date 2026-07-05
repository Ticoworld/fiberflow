HTTP gateway that proxies requests to the Fiber node JSON-RPC.

Built with [Bun](https://bun.sh) and [Hono](https://hono.dev).

## Docker (recommended)

Started automatically by `./start.sh` from the repo root.

```bash
curl http://localhost:3000/node-info
curl http://localhost:3000/list-channels
```

## Local development

Requires [Bun](https://bun.sh) and a running Fiber node with RPC reachable at `127.0.0.1:8227`.

```bash
bun install
FIBER_RPC_URL=http://127.0.0.1:8227 bun run dev
```

## Routes

| Route | Fiber RPC method |
|-------|------------------|
| `GET /health` | — |
| `GET /node-info` | `node_info` |
| `GET /list-channels` | `list_channels` |
| `GET /list-peers` | `list_peers` |
