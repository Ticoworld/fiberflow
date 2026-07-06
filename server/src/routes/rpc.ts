import { Hono } from 'hono'

import { fiberRpc } from '../fiber-rpc'

export const rpcRoutes = new Hono()

rpcRoutes.get('/node-info', async (c) => {
  const result = await fiberRpc('node_info')
  return c.json(result)
})

rpcRoutes.get('/list-channels', async (c) => {
  const includeClosed = c.req.query('include_closed') === 'true'
  const peerId = c.req.query('peer_id')

  const params: Record<string, unknown> = { include_closed: includeClosed }
  if (peerId) {
    params.peer_id = peerId
  }

  const result = await fiberRpc('list_channels', [params])
  return c.json(result)
})

rpcRoutes.get('/list-peers', async (c) => {
  const result = await fiberRpc('list_peers')
  return c.json(result)
})
