import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { FiberRpcError, fiberRpc } from './fiber-rpc'

const app = new Hono()

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
