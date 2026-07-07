import { and, desc, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'

import { db } from '../db'
import { storeWebhook, webhookDelivery, webhookEvent } from '../db/schema'
import { generateWebhookSecret } from './webhook-crypto'

const storeWebhookSelect = {
  id: storeWebhook.id,
  name: storeWebhook.name,
  url: storeWebhook.url,
  secret: storeWebhook.secret,
  enabled: storeWebhook.enabled,
  createdAt: storeWebhook.createdAt,
  updatedAt: storeWebhook.updatedAt,
}

function validateWebhookUrl(url: string) {
  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    throw new HTTPException(400, { message: 'Enter a valid webhook URL' })
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new HTTPException(400, { message: 'Webhook URL must use http or https' })
  }

  if (parsed.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    throw new HTTPException(400, {
      message: 'HTTP webhook URLs are only allowed for localhost',
    })
  }
}

function validateWebhookName(name: string) {
  const trimmed = name.trim()

  if (!trimmed) {
    throw new HTTPException(400, { message: 'Name is required' })
  }

  if (trimmed.length > 100) {
    throw new HTTPException(400, { message: 'Name must be 100 characters or less' })
  }

  return trimmed
}

export async function listStoreWebhooks(storeId: string) {
  return db
    .select(storeWebhookSelect)
    .from(storeWebhook)
    .where(eq(storeWebhook.storeId, storeId))
    .orderBy(desc(storeWebhook.createdAt))
}

export async function getStoreWebhookById(storeId: string, webhookId: string) {
  const [config] = await db
    .select(storeWebhookSelect)
    .from(storeWebhook)
    .where(and(eq(storeWebhook.id, webhookId), eq(storeWebhook.storeId, storeId)))

  return config ?? null
}

export async function createStoreWebhook(
  storeId: string,
  input: { name: string; url: string; enabled?: boolean },
) {
  const name = validateWebhookName(input.name)
  const url = input.url.trim()
  validateWebhookUrl(url)

  const secret = generateWebhookSecret()

  const [created] = await db
    .insert(storeWebhook)
    .values({
      storeId,
      name,
      url,
      secret,
      enabled: input.enabled ?? true,
    })
    .returning(storeWebhookSelect)

  return created
}

export async function updateStoreWebhook(
  storeId: string,
  webhookId: string,
  input: { name?: string; url?: string; enabled?: boolean },
) {
  const existing = await getStoreWebhookById(storeId, webhookId)

  if (!existing) {
    throw new HTTPException(404, { message: 'Webhook not found' })
  }

  const updates: {
    name?: string
    url?: string
    enabled?: boolean
  } = {}

  if (input.name !== undefined) {
    updates.name = validateWebhookName(input.name)
  }

  if (input.url !== undefined) {
    const url = input.url.trim()
    validateWebhookUrl(url)
    updates.url = url
  }

  if (input.enabled !== undefined) {
    updates.enabled = input.enabled
  }

  if (Object.keys(updates).length === 0) {
    throw new HTTPException(400, { message: 'No updates provided' })
  }

  const [updated] = await db
    .update(storeWebhook)
    .set(updates)
    .where(and(eq(storeWebhook.id, webhookId), eq(storeWebhook.storeId, storeId)))
    .returning(storeWebhookSelect)

  return updated
}

export async function rotateStoreWebhookSecret(storeId: string, webhookId: string) {
  const existing = await getStoreWebhookById(storeId, webhookId)

  if (!existing) {
    throw new HTTPException(404, { message: 'Webhook not found' })
  }

  const secret = generateWebhookSecret()

  const [updated] = await db
    .update(storeWebhook)
    .set({ secret })
    .where(and(eq(storeWebhook.id, webhookId), eq(storeWebhook.storeId, storeId)))
    .returning(storeWebhookSelect)

  return updated
}

export async function deleteStoreWebhook(storeId: string, webhookId: string) {
  const deleted = await db
    .delete(storeWebhook)
    .where(and(eq(storeWebhook.id, webhookId), eq(storeWebhook.storeId, storeId)))
    .returning({ id: storeWebhook.id })

  if (deleted.length === 0) {
    throw new HTTPException(404, { message: 'Webhook not found' })
  }
}

export async function listWebhookLogs(storeId: string, webhookId: string) {
  const webhook = await getStoreWebhookById(storeId, webhookId)

  if (!webhook) {
    throw new HTTPException(404, { message: 'Webhook not found' })
  }

  return db
    .select({
      id: webhookDelivery.id,
      eventType: webhookEvent.eventType,
      payload: webhookEvent.payload,
      status: webhookDelivery.status,
      httpStatus: webhookDelivery.httpStatus,
      responseBody: webhookDelivery.responseBody,
      attempt: webhookDelivery.attempt,
      createdAt: webhookDelivery.createdAt,
      updatedAt: webhookDelivery.updatedAt,
    })
    .from(webhookDelivery)
    .innerJoin(webhookEvent, eq(webhookEvent.id, webhookDelivery.eventId))
    .where(eq(webhookDelivery.webhookId, webhookId))
    .orderBy(desc(webhookDelivery.createdAt))
    .limit(100)
}
