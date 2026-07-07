import { and, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'

import { db } from '../db'
import { store } from '../db/schema'

export async function getStoreForUser(storeId: string, userId: string) {
  const [record] = await db
    .select()
    .from(store)
    .where(and(eq(store.id, storeId), eq(store.createdBy, userId)))

  return record ?? null
}

export async function requireStoreForUser(storeId: string, userId: string) {
  const record = await getStoreForUser(storeId, userId)

  if (!record) {
    throw new HTTPException(404, { message: 'Store not found' })
  }

  return record
}
