import { and, eq } from 'drizzle-orm'

import { db } from '../db'
import {
  type Invoice,
  storeWebhook,
  webhookDelivery,
  webhookEvent,
  type WebhookEventPayload,
  type WebhookEventType,
} from '../db/schema'
import { formatWebhookSignatureHeader } from './webhook-crypto'

const MAX_DELIVERY_ATTEMPTS = 5
const DELIVERY_TIMEOUT_MS = 10_000

const RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  24 * 60 * 60_000,
] as const

function buildWebhookPayload(
  eventType: WebhookEventType,
  invoice: Invoice,
): WebhookEventPayload {
  return {
    id: crypto.randomUUID(),
    type: eventType,
    created_at: new Date().toISOString(),
    data: {
      invoice_id: invoice.id,
      order_id: invoice.orderId,
      payment_hash: invoice.paymentHash,
      amount_in_usd: invoice.amountInUSD,
      status: invoice.status,
      customer_email: invoice.customerEmail,
    },
  }
}

export async function enqueueWebhookForInvoice(
  storeId: string | null,
  eventType: WebhookEventType,
  invoice: Invoice,
): Promise<void> {
  if (!storeId) {
    return
  }

  const webhooks = await db
    .select()
    .from(storeWebhook)
    .where(and(eq(storeWebhook.storeId, storeId), eq(storeWebhook.enabled, true)))

  if (webhooks.length === 0) {
    return
  }

  const idempotencyKey = `${eventType}:${invoice.id}`
  const payload = buildWebhookPayload(eventType, invoice)

  const [event] = await db
    .insert(webhookEvent)
    .values({
      storeId,
      invoiceId: invoice.id,
      eventType,
      payload,
      idempotencyKey,
    })
    .onConflictDoNothing()
    .returning()

  if (!event) {
    const [existingEvent] = await db
      .select()
      .from(webhookEvent)
      .where(eq(webhookEvent.idempotencyKey, idempotencyKey))

    if (!existingEvent) {
      return
    }

    await createDeliveriesForWebhooks(existingEvent.id, webhooks)
    return
  }

  await createDeliveriesForWebhooks(event.id, webhooks)
}

async function createDeliveriesForWebhooks(
  eventId: string,
  webhooks: Array<{ id: string }>,
): Promise<void> {
  for (const webhook of webhooks) {
    const [delivery] = await db
      .insert(webhookDelivery)
      .values({ eventId, webhookId: webhook.id })
      .onConflictDoNothing()
      .returning()

    if (delivery) {
      void deliverWebhook(delivery.id)
    }
  }
}

export async function deliverWebhook(deliveryId: string): Promise<void> {
  const [record] = await db
    .select({
      delivery: webhookDelivery,
      event: webhookEvent,
      webhook: storeWebhook,
    })
    .from(webhookDelivery)
    .innerJoin(webhookEvent, eq(webhookEvent.id, webhookDelivery.eventId))
    .innerJoin(storeWebhook, eq(storeWebhook.id, webhookDelivery.webhookId))
    .where(eq(webhookDelivery.id, deliveryId))

  if (!record || record.delivery.status !== 'pending' || !record.webhook.enabled) {
    return
  }

  const body = JSON.stringify(record.event.payload)
  const signature = formatWebhookSignatureHeader(record.webhook.secret, body)

  let httpStatus: number | null = null
  let responseBody: string | null = null
  let succeeded = false

  try {
    const response = await fetch(record.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FiberFlow-Signature': signature,
        'X-FiberFlow-Event': record.event.eventType,
        'X-FiberFlow-Delivery-Id': record.delivery.id,
      },
      body,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    })

    httpStatus = response.status
    responseBody = await response.text()
    succeeded = response.ok
  } catch (error) {
    responseBody = error instanceof Error ? error.message : 'Webhook delivery failed'
  }

  if (succeeded) {
    await db
      .update(webhookDelivery)
      .set({
        status: 'succeeded',
        httpStatus,
        responseBody,
      })
      .where(eq(webhookDelivery.id, deliveryId))

    return
  }

  const nextAttempt = record.delivery.attempt + 1

  if (nextAttempt > MAX_DELIVERY_ATTEMPTS) {
    await db
      .update(webhookDelivery)
      .set({
        status: 'failed',
        attempt: nextAttempt,
        httpStatus,
        responseBody,
      })
      .where(eq(webhookDelivery.id, deliveryId))

    return
  }

  const retryDelay = RETRY_DELAYS_MS[Math.min(nextAttempt - 1, RETRY_DELAYS_MS.length - 1)]

  await db
    .update(webhookDelivery)
    .set({
      attempt: nextAttempt,
      httpStatus,
      responseBody,
      nextRetryAt: new Date(Date.now() + retryDelay),
    })
    .where(eq(webhookDelivery.id, deliveryId))
}
