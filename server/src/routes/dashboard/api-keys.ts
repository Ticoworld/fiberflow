import { and, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { db } from '../../db'
import { apiKey } from '../../db/schema'
import { generateApiKey } from '../../lib/api-key'
import { requireStoreForUser } from '../../lib/store'
import { type AuthVariables, requireAuth } from '../../middleware/auth'

export const apiKeyRoutes = new Hono<{ Variables: AuthVariables }>()

apiKeyRoutes.use('*', requireAuth)

apiKeyRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  const storeId = c.req.param('storeId')

  await requireStoreForUser(storeId, userId)

  const keys = await db
    .select({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
    })
    .from(apiKey)
    .where(eq(apiKey.storeId, storeId))
    .orderBy(desc(apiKey.createdAt))

  return c.json({ apiKeys: keys })
})

apiKeyRoutes.post('/', async (c) => {
  const userId = c.get('userId')
  const storeId = c.req.param('storeId')

  await requireStoreForUser(storeId, userId)

  const body = await c.req.json<{ name?: string }>()
  const name = body.name?.trim()

  if (!name) {
    throw new HTTPException(400, { message: 'Name is required' })
  }

  if (name.length > 100) {
    throw new HTTPException(400, { message: 'Name must be 100 characters or less' })
  }

  const { rawKey, prefix, hash } = generateApiKey()
  const id = crypto.randomUUID()

  const [created] = await db
    .insert(apiKey)
    .values({
      id,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      storeId,
    })
    .returning({
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt,
    })

  return c.json(
    {
      apiKey: {
        ...created,
        token: rawKey,
      },
    },
    201,
  )
})

apiKeyRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const storeId = c.req.param('storeId')
  const id = c.req.param('id')

  await requireStoreForUser(storeId, userId)

  const deleted = await db
    .delete(apiKey)
    .where(and(eq(apiKey.id, id), eq(apiKey.storeId, storeId)))
    .returning({ id: apiKey.id })

  if (deleted.length === 0) {
    throw new HTTPException(404, { message: 'API key not found' })
  }

  return c.json({ success: true })
})
