HTTP gateway that proxies Fiber RPC, serves Better Auth, and connects to Neon via Drizzle.

Built with [Bun](https://bun.sh), [Hono](https://hono.dev), [Drizzle ORM](https://orm.drizzle.team), and [Better Auth](https://better-auth.com).

## Setup

```bash
cp .env.example .env
# set DATABASE_URL, BETTER_AUTH_SECRET (bunx @better-auth/cli secret)

bun install
bun run db:push
bun run dev
```

## Docker

Started automatically by `./start.sh` from the repo root. Uses `server/.env` for database and auth config.

## Routes

### `/api/*` — frontend ↔ backend

| Route | Description |
|-------|-------------|
| `GET/POST /api/auth/*` | Better Auth endpoints |
| `GET /api/todos` | List todos |
| `POST /api/todos` | Create todo |

### `/rpc/*` — server ↔ Fiber node

| Route | Description |
|-------|-------------|
| `GET /rpc/node-info` | Fiber node info |
| `GET /rpc/list-channels` | Fiber channels |
| `GET /rpc/list-peers` | Fiber peers |

### Other

| Route | Description |
|-------|-------------|
| `GET /health` | Health check |

## Database scripts

```bash
bun run db:push      # push schema to Neon
bun run db:generate  # generate Drizzle migrations
bun run db:migrate   # run migrations
bun run db:studio    # Drizzle Studio
bun run auth:generate # regenerate Better Auth schema
```
