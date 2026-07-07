import { desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { db } from '../../db'
import { store } from '../../db/schema'
import { type AuthVariables, requireAuth } from '../../middleware/auth'
import { apiKeyRoutes } from './api-keys'
import { invoiceRoutes } from './invoices'

export const storeRoutes = new Hono<{ Variables: AuthVariables }>()

storeRoutes.use('*', requireAuth)

storeRoutes.get('/', async (c) => {
  const userId = c.get('userId')

  const stores = await db
    .select({
      id: store.id,
      name: store.name,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    })
    .from(store)
    .where(eq(store.createdBy, userId))
    .orderBy(desc(store.createdAt))

  return c.json({ stores })
})

storeRoutes.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ name?: string }>()
  const name = body.name?.trim()

  if (!name) {
    throw new HTTPException(400, { message: 'Name is required' })
  }

  if (name.length > 100) {
    throw new HTTPException(400, { message: 'Name must be 100 characters or less' })
  }

  const id = crypto.randomUUID()

  const [created] = await db
    .insert(store)
    .values({
      id,
      name,
      createdBy: userId,
    })
    .returning({
      id: store.id,
      name: store.name,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    })

  return c.json({ store: created }, 201)
})

storeRoutes.route('/:storeId/api-keys', apiKeyRoutes)
storeRoutes.route('/:storeId/invoices', invoiceRoutes)
