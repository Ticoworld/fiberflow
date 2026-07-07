import { and, eq, inArray, isNull, lte } from 'drizzle-orm'

import { db } from '../db'
import {
  type Invoice,
  type InvoiceStatus,
  invoice,
  webhookDelivery,
  webhookEvent,
  type WebhookEventType,
} from '../db/schema'
import { fiberRpc } from '../fiber-rpc'
import {
  type FiberGetInvoiceResult,
  type FiberHexString,
  type FiberInvoiceStatus,
} from './fiber-invoice'
import { deliverWebhook, enqueueWebhookForInvoice } from './webhook-service'

const TERMINAL_STATUSES: InvoiceStatus[] = ['Paid', 'Expired', 'Cancelled']

function mapFiberStatus(status: FiberInvoiceStatus): InvoiceStatus {
  switch (status) {
    case 'Open':
      return 'Open'
    case 'Received':
      return 'Received'
    case 'Paid':
      return 'Paid'
    case 'Expired':
      return 'Expired'
    case 'Cancelled':
      return 'Cancelled'
    default: {
      const exhaustiveCheck: never = status
      throw new Error(`Unknown Fiber invoice status: ${exhaustiveCheck}`)
    }
  }
}

export function getWebhookEventType(
  previousStatus: InvoiceStatus,
  nextStatus: InvoiceStatus,
): WebhookEventType | null {
  if (previousStatus === nextStatus) {
    return null
  }

  switch (nextStatus) {
    case 'Received':
      return previousStatus === 'Open' ? 'invoice.received' : null
    case 'Paid':
      return 'invoice.paid'
    case 'Expired':
      return 'invoice.expired'
    case 'Cancelled':
      return 'invoice.cancelled'
    default:
      return null
  }
}

async function fetchFiberInvoiceStatus(paymentHash: string): Promise<InvoiceStatus | null> {
  try {
    const result = await fiberRpc<FiberGetInvoiceResult>('get_invoice', [
      { payment_hash: paymentHash as FiberHexString },
    ])

    return mapFiberStatus(result.status)
  } catch (error) {
    console.error(`Failed to sync invoice status for payment hash ${paymentHash}:`, error)
    return null
  }
}

export async function syncInvoiceStatus(record: Invoice): Promise<Invoice> {
  if (!record.paymentHash || TERMINAL_STATUSES.includes(record.status)) {
    return record
  }

  const fiberStatus = await fetchFiberInvoiceStatus(record.paymentHash)
  if (!fiberStatus || fiberStatus === record.status) {
    return record
  }

  const [updated] = await db
    .update(invoice)
    .set({ status: fiberStatus })
    .where(eq(invoice.id, record.id))
    .returning()

  const eventType = getWebhookEventType(record.status, updated.status)
  if (eventType) {
    await enqueueWebhookForInvoice(updated.storeId, eventType, updated)
  }

  return updated
}

export async function syncInvoices(records: Invoice[]): Promise<Invoice[]> {
  const synced = await Promise.all(records.map((record) => syncInvoiceStatus(record)))
  return synced
}

export async function pollPendingInvoices(): Promise<void> {
  const pending = await db
    .select()
    .from(invoice)
    .where(inArray(invoice.status, ['Open', 'Received']))

  await syncInvoices(pending)
  await reconcilePaidInvoiceWebhooks()
}

async function reconcilePaidInvoiceWebhooks(): Promise<void> {
  const missing = await db
    .select({ invoice: invoice })
    .from(invoice)
    .leftJoin(
      webhookEvent,
      and(
        eq(webhookEvent.invoiceId, invoice.id),
        eq(webhookEvent.eventType, 'invoice.paid'),
      ),
    )
    .where(and(eq(invoice.status, 'Paid'), isNull(webhookEvent.id)))

  for (const { invoice: record } of missing) {
    if (!record.storeId) {
      continue
    }

    await enqueueWebhookForInvoice(record.storeId, 'invoice.paid', record)
  }
}

export async function processDueWebhookDeliveries(): Promise<void> {
  const due = await db
    .select({ deliveryId: webhookDelivery.id })
    .from(webhookDelivery)
    .where(
      and(
        eq(webhookDelivery.status, 'pending'),
        lte(webhookDelivery.nextRetryAt, new Date()),
      ),
    )
    .limit(25)

  for (const { deliveryId } of due) {
    await deliverWebhook(deliveryId)
  }
}
