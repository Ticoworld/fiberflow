import { eq } from 'drizzle-orm'

import { db } from '../db'
import { apiKey } from '../db/schema'
import { hashApiKey } from './api-key'

const API_KEY_PREFIX = 'ffg_'

export type ResolvedApiKey = {
  id: string
  name: string
  storeId: string
}

export async function resolveApiKey(
  rawKey: string,
): Promise<ResolvedApiKey | null> {
  if (!rawKey.startsWith(API_KEY_PREFIX)) {
    return null
  }

  const keyHash = hashApiKey(rawKey)

  const [record] = await db
    .select({
      id: apiKey.id,
      name: apiKey.name,
      storeId: apiKey.storeId,
    })
    .from(apiKey)
    .where(eq(apiKey.keyHash, keyHash))

  if (!record) {
    return null
  }

  await db
    .update(apiKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKey.id, record.id))

  return record
}
