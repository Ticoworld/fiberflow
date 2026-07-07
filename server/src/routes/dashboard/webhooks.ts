import { Hono, type Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

import {
  createStoreWebhook,
  deleteStoreWebhook,
  getStoreWebhookById,
  listStoreWebhooks,
  listWebhookLogs,
  rotateStoreWebhookSecret,
  updateStoreWebhook,
} from '../../lib/store-webhook'
import { requireStoreForUser } from '../../lib/store'
import { type AuthVariables, requireAuth } from '../../middleware/auth'

type WebhookRouteEnv = {
  Variables: AuthVariables
  Param: {
    storeId: string
    webhookId?: string
  }
}

function getStoreId(c: Context<WebhookRouteEnv>): string {
  const storeId = c.req.param('storeId')

  if (!storeId) {
    throw new HTTPException(400, { message: 'Store ID is required' })
  }

  return storeId
}

function getWebhookId(c: Context<WebhookRouteEnv>): string {
  const webhookId = c.req.param('webhookId')

  if (!webhookId) {
    throw new HTTPException(400, { message: 'Webhook ID is required' })
  }

  return webhookId
}

export const webhookRoutes = new Hono<WebhookRouteEnv>()

webhookRoutes.use('*', requireAuth)

webhookRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  const storeId = getStoreId(c)

  await requireStoreForUser(storeId, userId)

  const webhooks = await listStoreWebhooks(storeId)
  return c.json({ webhooks })
})

webhookRoutes.post('/', async (c) => {
  const userId = c.get('userId')
  const storeId = getStoreId(c)

  await requireStoreForUser(storeId, userId)

  const body = await c.req.json<{ name?: string; url?: string; enabled?: boolean }>()

  if (!body.url?.trim()) {
    throw new HTTPException(400, { message: 'url is required' })
  }

  if (!body.name?.trim()) {
    throw new HTTPException(400, { message: 'name is required' })
  }

  const webhook = await createStoreWebhook(storeId, {
    name: body.name,
    url: body.url,
    enabled: body.enabled,
  })

  return c.json({ webhook }, 201)
})

webhookRoutes.get('/:webhookId', async (c) => {
  const userId = c.get('userId')
  const storeId = getStoreId(c)
  const webhookId = getWebhookId(c)

  await requireStoreForUser(storeId, userId)

  const webhook = await getStoreWebhookById(storeId, webhookId)

  if (!webhook) {
    throw new HTTPException(404, { message: 'Webhook not found' })
  }

  return c.json({ webhook })
})

webhookRoutes.patch('/:webhookId', async (c) => {
  const userId = c.get('userId')
  const storeId = getStoreId(c)
  const webhookId = getWebhookId(c)

  await requireStoreForUser(storeId, userId)

  const body = await c.req.json<{ name?: string; url?: string; enabled?: boolean }>()

  const webhook = await updateStoreWebhook(storeId, webhookId, body)
  return c.json({ webhook })
})

webhookRoutes.post('/:webhookId/rotate-secret', async (c) => {
  const userId = c.get('userId')
  const storeId = getStoreId(c)
  const webhookId = getWebhookId(c)

  await requireStoreForUser(storeId, userId)

  const webhook = await rotateStoreWebhookSecret(storeId, webhookId)
  return c.json({ webhook })
})

webhookRoutes.get('/:webhookId/logs', async (c) => {
  const userId = c.get('userId')
  const storeId = getStoreId(c)
  const webhookId = getWebhookId(c)

  await requireStoreForUser(storeId, userId)

  const logs = await listWebhookLogs(storeId, webhookId)
  return c.json({ logs })
})

webhookRoutes.delete('/:webhookId', async (c) => {
  const userId = c.get('userId')
  const storeId = getStoreId(c)
  const webhookId = getWebhookId(c)

  await requireStoreForUser(storeId, userId)

  await deleteStoreWebhook(storeId, webhookId)
  return c.json({ success: true })
})
