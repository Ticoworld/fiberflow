import { and, eq, isNull, lte } from 'drizzle-orm'

import { db } from '../db'
import {
  type Invoice,
  type InvoiceStatus,
  invoice,
  type NewInvoice,
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

export function mapFiberStatus(status: FiberInvoiceStatus): InvoiceStatus {
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

export async function getFiberInvoice(paymentHash: string): Promise<FiberGetInvoiceResult> {
  return fiberRpc<FiberGetInvoiceResult>('get_invoice', [
    { payment_hash: paymentHash as FiberHexString },
  ])
}

function buildFiberInvoicePatch(
  record: Invoice,
  fiberResult: FiberGetInvoiceResult,
): Partial<NewInvoice> | null {
  const nextStatus = mapFiberStatus(fiberResult.status)

  const patch: Partial<NewInvoice> = {
    status: nextStatus,
    invoiceAddress: fiberResult.invoice_address,
  }

  if (fiberResult.invoice.amount) {
    patch.amount = fiberResult.invoice.amount
  }

  if (fiberResult.invoice.signature !== undefined) {
    patch.signature = fiberResult.invoice.signature ?? null
  }

  const nextAmount = patch.amount ?? record.amount
  const nextSignature = patch.signature !== undefined ? patch.signature : record.signature

  const unchanged =
    nextStatus === record.status &&
    fiberResult.invoice_address === record.invoiceAddress &&
    nextAmount === record.amount &&
    nextSignature === record.signature

  if (unchanged) {
    return null
  }

  return patch
}

export async function applyFiberInvoiceState(
  record: Invoice,
  fiberResult: FiberGetInvoiceResult,
  options: { fireWebhooks?: boolean } = { fireWebhooks: true },
): Promise<Invoice> {
  const patch = buildFiberInvoicePatch(record, fiberResult)

  if (!patch) {
    return record
  }

  const previousStatus = record.status

  const [updated] = await db
    .update(invoice)
    .set(patch)
    .where(eq(invoice.id, record.id))
    .returning()

  if (options.fireWebhooks) {
    const eventType = getWebhookEventType(previousStatus, updated.status)
    if (eventType) {
      await enqueueWebhookForInvoice(updated.storeId, eventType, updated)
    }
  }

  return updated
}

export type SyncInvoiceOptions = {
  /** When true, always consult Fiber even for terminal DB statuses. */
  always?: boolean
  poll?: boolean
}

export async function syncInvoiceStatus(
  record: Invoice,
  options: SyncInvoiceOptions = {},
): Promise<Invoice> {
  if (!record.paymentHash) {
    return record
  }

  if (options.poll && record.status !== 'Open') {
    return record
  }

  if (!options.always && !options.poll && TERMINAL_STATUSES.includes(record.status)) {
    return record
  }

  try {
    const fiberResult = await getFiberInvoice(record.paymentHash)
    return applyFiberInvoiceState(record, fiberResult)
  } catch (error) {
    console.error(`Failed to sync invoice status for payment hash ${record.paymentHash}:`, error)
    return record
  }
}

export async function syncInvoices(records: Invoice[]): Promise<Invoice[]> {
  const synced = await Promise.all(records.map((record) => syncInvoiceStatus(record)))
  return synced
}

export async function pollPendingInvoices(): Promise<void> {
  const pending = await db.select().from(invoice).where(eq(invoice.status, 'Open'))

  await Promise.all(pending.map((record) => syncInvoiceStatus(record, { poll: true })))
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
