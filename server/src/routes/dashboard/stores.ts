import { desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { db } from '../../db'
import { store } from '../../db/schema'
import {
  generateUniqueStoreSlug,
  isStoreSlugTaken,
  normalizeStoreSlug,
  validateStoreSlug,
} from '../../lib/store-slug'
import { requireStoreBySlugForUser } from '../../lib/store'
import { type AuthVariables, requireAuth } from '../../middleware/auth'
import { apiKeyRoutes } from './api-keys'
import { invoiceRoutes } from './invoices'

const storeSelect = {
  id: store.id,
  name: store.name,
  slug: store.slug,
  logo: store.logo,
  createdAt: store.createdAt,
  updatedAt: store.updatedAt,
}

export const storeRoutes = new Hono<{ Variables: AuthVariables }>()

storeRoutes.use('*', requireAuth)

storeRoutes.get('/', async (c) => {
  const userId = c.get('userId')

  const stores = await db
    .select(storeSelect)
    .from(store)
    .where(eq(store.createdBy, userId))
    .orderBy(desc(store.createdAt))

  return c.json({ stores })
})

storeRoutes.get('/slug/:slug', async (c) => {
  const userId = c.get('userId')
  const slug = c.req.param('slug')

  const record = await requireStoreBySlugForUser(slug, userId)

  return c.json({
    store: {
      id: record.id,
      name: record.name,
      slug: record.slug,
      logo: record.logo,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
  })
})

storeRoutes.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ name?: string; slug?: string }>()
  const name = body.name?.trim()

  if (!name) {
    throw new HTTPException(400, { message: 'Name is required' })
  }

  if (name.length > 100) {
    throw new HTTPException(400, { message: 'Name must be 100 characters or less' })
  }

  let slug: string

  if (body.slug?.trim()) {
    slug = normalizeStoreSlug(body.slug)
    const slugError = validateStoreSlug(slug)

    if (slugError) {
      throw new HTTPException(400, { message: slugError })
    }

    if (await isStoreSlugTaken(slug)) {
      throw new HTTPException(409, { message: 'This store URL is already taken' })
    }
  } else {
    slug = await generateUniqueStoreSlug(name)
  }

  const [created] = await db
    .insert(store)
    .values({
      name,
      slug,
      createdBy: userId,
    })
    .returning(storeSelect)

  return c.json({ store: created }, 201)
})

storeRoutes.route('/:storeId/api-keys', apiKeyRoutes)
storeRoutes.route('/:storeId/invoices', invoiceRoutes)
