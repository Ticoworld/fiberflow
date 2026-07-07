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
import { requireStoreBySlugForUser, requireStoreForUser } from '../../lib/store'
import { type AuthVariables, requireAuth } from '../../middleware/auth'
import { apiKeyRoutes } from './api-keys'
import { invoiceRoutes } from './invoices'
import { webhookRoutes } from './webhooks'

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

storeRoutes.patch('/:storeId', async (c) => {
  const userId = c.get('userId')
  const storeId = c.req.param('storeId')
  const record = await requireStoreForUser(storeId, userId)
  const body = await c.req.json<{ name?: string; slug?: string; logo?: string | null }>()

  const updates: {
    name?: string
    slug?: string
    logo?: string | null
  } = {}

  if (body.name !== undefined) {
    const name = body.name.trim()

    if (!name) {
      throw new HTTPException(400, { message: 'Name is required' })
    }

    if (name.length > 100) {
      throw new HTTPException(400, { message: 'Name must be 100 characters or less' })
    }

    updates.name = name
  }

  if (body.slug !== undefined) {
    const slug = normalizeStoreSlug(body.slug)
    const slugError = validateStoreSlug(slug)

    if (slugError) {
      throw new HTTPException(400, { message: slugError })
    }

    if (slug !== record.slug && (await isStoreSlugTaken(slug, storeId))) {
      throw new HTTPException(409, { message: 'This store URL is already taken' })
    }

    updates.slug = slug
  }

  if (body.logo !== undefined) {
    const logo = body.logo?.trim() ?? ''
    updates.logo = logo.length > 0 ? logo : null
  }

  if (Object.keys(updates).length === 0) {
    throw new HTTPException(400, { message: 'No updates provided' })
  }

  const [updated] = await db
    .update(store)
    .set(updates)
    .where(eq(store.id, storeId))
    .returning(storeSelect)

  return c.json({ store: updated })
})

storeRoutes.route('/:storeId/api-keys', apiKeyRoutes)
storeRoutes.route('/:storeId/invoices', invoiceRoutes)
storeRoutes.route('/:storeId/webhooks', webhookRoutes)
