import 'dotenv/config'

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'

import { FiberRpcError } from './fiber-rpc'
import { dashboardRoutes } from './routes/dashboard'
import { integrationRoutes } from './routes/integration'
import { publicRoutes } from './routes/public'
import { startBackgroundWorkers } from './workers'

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

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.route('/api', dashboardRoutes)
app.route('/v1', integrationRoutes)
app.route('/public', publicRoutes)

startBackgroundWorkers()

const port = Number(process.env.PORT ?? 3000)

export default {
  port,
  fetch: app.fetch,
}
