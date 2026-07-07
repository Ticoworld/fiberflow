import { createHash } from 'crypto'
import { and, eq } from 'drizzle-orm'

import { db } from '../db'
import { idempotencyKey } from '../db/schema'
import { idempotencyConflict } from './merchant-errors'

const MAX_IDEMPOTENCY_KEY_LENGTH = 255
const IDEMPOTENCY_PROCESSING_STATUS = 0

export function normalizeIdempotencyKey(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  const key = value.trim()

  if (!key) {
    return null
  }

  if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    idempotencyConflict(
      `Idempotency-Key must be ${MAX_IDEMPOTENCY_KEY_LENGTH} characters or less.`,
      'idempotency_key_too_long',
    )
  }

  return key
}

export type IdempotencyBeginResult =
  | { action: 'proceed' }
  | { action: 'replay'; status: number; body: Record<string, unknown> }
  | { action: 'conflict' }

export async function beginIdempotentRequest(
  storeId: string,
  key: string,
  requestHash: string,
): Promise<IdempotencyBeginResult> {
  const [inserted] = await db
    .insert(idempotencyKey)
    .values({
      storeId,
      key,
      requestHash,
      responseStatus: IDEMPOTENCY_PROCESSING_STATUS,
      responseBody: { object: 'idempotency_request', status: 'processing' },
    })
    .onConflictDoNothing()
    .returning()

  if (inserted) {
    return { action: 'proceed' }
  }

  const [existing] = await db
    .select()
    .from(idempotencyKey)
    .where(and(eq(idempotencyKey.storeId, storeId), eq(idempotencyKey.key, key)))

  if (!existing) {
    return beginIdempotentRequest(storeId, key, requestHash)
  }

  if (existing.requestHash !== requestHash) {
    return { action: 'conflict' }
  }

  if (existing.responseStatus === IDEMPOTENCY_PROCESSING_STATUS) {
    idempotencyConflict(
      'A request with this Idempotency-Key is already in progress.',
      'idempotency_key_in_use',
    )
  }

  return {
    action: 'replay',
    status: existing.responseStatus,
    body: existing.responseBody,
  }
}

export async function completeIdempotentRequest(
  storeId: string,
  key: string,
  status: number,
  body: Record<string, unknown>,
): Promise<void> {
  await db
    .update(idempotencyKey)
    .set({
      responseStatus: status,
      responseBody: body,
    })
    .where(and(eq(idempotencyKey.storeId, storeId), eq(idempotencyKey.key, key)))
}

export async function releaseIdempotentRequest(storeId: string, key: string): Promise<void> {
  await db
    .delete(idempotencyKey)
    .where(
      and(
        eq(idempotencyKey.storeId, storeId),
        eq(idempotencyKey.key, key),
        eq(idempotencyKey.responseStatus, IDEMPOTENCY_PROCESSING_STATUS),
      ),
    )
}

export function hashRequestBody(body: string): string {
  return createHash('sha256').update(body).digest('hex')
}
