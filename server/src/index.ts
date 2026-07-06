import 'dotenv/config'

import { desc } from 'drizzle-orm'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'

import { db } from './db'
import { todos } from './db/schema/todos'
import { auth } from './lib/auth'
import { FiberRpcError, fiberRpc } from './fiber-rpc'

const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const app = new Hono()

app.use(
  '*',
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
)

app.onError((error, c) => {
  if (error instanceof FiberRpcError) {
    return c.json({ error: error.message, code: error.code ?? null }, 502)
  }

  if (error instanceof HTTPException) {
    return error.getResponse()
  }

  console.error(error)
  return c.json({ error: 'Internal server error' }, 500)
})

app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.get('/api/todos', async (c) => {
  const rows = await db.query.todos.findMany({
    orderBy: [desc(todos.createdAt)],
  })

  return c.json(rows)
})

app.post('/api/todos', async (c) => {
  const body = await c.req.json<{ title?: string }>()
  const title = body.title?.trim()

  if (!title) {
    return c.json({ error: 'title is required' }, 400)
  }

  await db.insert(todos).values({ title })

  return c.json({ success: true })
})

app.get('/node-info', async (c) => {
  const result = await fiberRpc('node_info')
  return c.json(result)
})

app.get('/list-channels', async (c) => {
  const includeClosed = c.req.query('include_closed') === 'true'
  const peerId = c.req.query('peer_id')

  const params: Record<string, unknown> = { include_closed: includeClosed }
  if (peerId) {
    params.peer_id = peerId
  }

  const result = await fiberRpc('list_channels', [params])
  return c.json(result)
})

app.get('/list-peers', async (c) => {
  const result = await fiberRpc('list_peers')
  return c.json(result)
})

const port = Number(process.env.PORT ?? 3000)

export default {
  port,
  fetch: app.fetch,
}
