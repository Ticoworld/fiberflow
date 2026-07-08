import { and, desc, eq, lt, type SQL } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'

import { db } from '../db'
import { type InvoiceStatus, invoice } from '../db/schema'
import { fiberRpc } from '../fiber-rpc'
import {
  type FiberGetInvoiceResult,
  type FiberHexString,
  type FiberNewInvoiceParams,
  type FiberNewInvoiceResult,
  getInvoiceExpirySecondsFromAttrs,
  toFiberHexUInt,
} from './fiber-invoice'
import { formatRpcCurrency, getInvoiceCurrency } from './fiber-network'
import {
  applyFiberInvoiceState,
  getFiberInvoice,
  mapFiberStatus,
  syncInvoiceStatus,
  syncInvoices,
} from './invoice-sync'
import { usdToCents, usdToShannons } from './invoice-amount'
import { enqueueWebhookForInvoice } from './webhook-service'

const DEFAULT_EXPIRY_SECONDS = 7884000 // 91 days
const MAX_METADATA_KEYS = 50
const MAX_METADATA_KEY_LENGTH = 40
const MAX_METADATA_VALUE_LENGTH = 500

const CANCELLABLE_STATUSES: InvoiceStatus[] = ['Open']
const NON_CANCELLABLE_STATUSES: InvoiceStatus[] = ['Paid', 'Expired', 'Cancelled']

export type CreateInvoiceInput = {
  amountInUSD: number
  orderId: string
  customerEmail: string
  description?: string
  metadata?: Record<string, string>
  successUrl?: string
  cancelUrl?: string
}

export function normalizeInvoiceMetadata(metadata: unknown): Record<string, string> {
  if (metadata === undefined || metadata === null) {
    return {}
  }

  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new HTTPException(400, { message: 'metadata must be an object' })
  }

  const entries = Object.entries(metadata)

  if (entries.length > MAX_METADATA_KEYS) {
    throw new HTTPException(400, {
      message: `metadata must have ${MAX_METADATA_KEYS} keys or fewer`,
    })
  }

  const normalized: Record<string, string> = {}

  for (const [key, value] of entries) {
    if (!key.trim()) {
      throw new HTTPException(400, { message: 'metadata keys must be non-empty strings' })
    }

    if (key.length > MAX_METADATA_KEY_LENGTH) {
      throw new HTTPException(400, {
        message: `metadata key '${key}' exceeds ${MAX_METADATA_KEY_LENGTH} characters`,
      })
    }

    if (typeof value !== 'string') {
      throw new HTTPException(400, {
        message: `metadata value for '${key}' must be a string`,
      })
    }

    if (value.length > MAX_METADATA_VALUE_LENGTH) {
      throw new HTTPException(400, {
        message: `metadata value for '${key}' exceeds ${MAX_METADATA_VALUE_LENGTH} characters`,
      })
    }

    normalized[key] = value
  }

  return normalized
}

export function normalizeRedirectUrl(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'string') {
    throw new HTTPException(400, { message: `${fieldName} must be a string` })
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  let parsed: URL

  try {
    parsed = new URL(trimmed)
  } catch {
    throw new HTTPException(400, { message: `${fieldName} must be a valid URL` })
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HTTPException(400, {
      message: `${fieldName} must use http or https`,
    })
  }

  return trimmed
}

export function validateCreateInvoiceInput(body: Partial<CreateInvoiceInput>) {
  if (body.amountInUSD === undefined || body.amountInUSD <= 0) {
    throw new HTTPException(400, { message: 'amountInUSD must be greater than 0' })
  }

  if (!body.orderId?.trim()) {
    throw new HTTPException(400, { message: 'orderId is required' })
  }

  if (!body.customerEmail?.trim()) {
    throw new HTTPException(400, { message: 'customerEmail is required' })
  }
}

export async function createInvoice(storeId: string, body: CreateInvoiceInput) {
  validateCreateInvoiceInput(body)

  const metadata = normalizeInvoiceMetadata(body.metadata)
  const successUrl = normalizeRedirectUrl(body.successUrl, 'successUrl')
  const cancelUrl = normalizeRedirectUrl(body.cancelUrl, 'cancelUrl')

  const currency = getInvoiceCurrency()
  const amount = await usdToShannons(body.amountInUSD)
  const amountInUSD = usdToCents(body.amountInUSD)

  const rpcParams: FiberNewInvoiceParams = {
    amount: toFiberHexUInt(amount),
    currency: formatRpcCurrency(currency),
    expiry: toFiberHexUInt(DEFAULT_EXPIRY_SECONDS),
    ...(body.description ? { description: body.description } : {}),
  }

  const result = await fiberRpc<FiberNewInvoiceResult>('new_invoice', [rpcParams])

  if (!result.invoice.amount) {
    throw new HTTPException(502, { message: 'Fiber RPC new_invoice returned no invoice amount' })
  }

  const expirySeconds = getInvoiceExpirySecondsFromAttrs(result.invoice.data.attrs)

  if (expirySeconds === undefined) {
    throw new HTTPException(502, { message: 'Fiber RPC new_invoice returned no invoice expiry' })
  }

  const [created] = await db
    .insert(invoice)
    .values({
      paymentHash: result.invoice.data.payment_hash,
      invoiceAddress: result.invoice_address,
      signature: result.invoice.signature ?? null,
      amount: result.invoice.amount,
      amountInUSD,
      currency,
      description: body.description ?? null,
      expirySeconds,
      status: 'Open',
      storeId,
      orderId: body.orderId.trim(),
      customerEmail: body.customerEmail.trim(),
      metadata,
      successUrl: successUrl ?? null,
      cancelUrl: cancelUrl ?? null,
    })
    .returning()

  if (!created.paymentHash) {
    throw new HTTPException(502, { message: 'Fiber RPC new_invoice returned no payment hash' })
  }

  const fiberState = await getFiberInvoice(created.paymentHash)
  const synced = await applyFiberInvoiceState(created, fiberState, { fireWebhooks: false })

  await enqueueWebhookForInvoice(storeId, 'invoice.created', synced)

  return synced
}

export type ListInvoicesOptions = {
  limit: number
  startingAfter?: number
  status?: InvoiceStatus
}

export type ListInvoicesResult = {
  invoices: Awaited<ReturnType<typeof syncInvoices>>
  hasMore: boolean
}

export async function listInvoicesForStorePaginated(
  storeId: string,
  options: ListInvoicesOptions,
): Promise<ListInvoicesResult> {
  const conditions: SQL[] = [eq(invoice.storeId, storeId)]

  if (options.startingAfter !== undefined) {
    conditions.push(lt(invoice.id, options.startingAfter))
  }

  if (options.status) {
    conditions.push(eq(invoice.status, options.status))
  }

  const records = await db
    .select()
    .from(invoice)
    .where(and(...conditions))
    .orderBy(desc(invoice.id))
    .limit(options.limit + 1)

  const hasMore = records.length > options.limit
  const page = hasMore ? records.slice(0, options.limit) : records

  return {
    invoices: await syncInvoices(page),
    hasMore,
  }
}

export async function listInvoicesForStore(storeId: string) {
  const records = await db
    .select()
    .from(invoice)
    .where(eq(invoice.storeId, storeId))
    .orderBy(desc(invoice.createdAt))

  return syncInvoices(records)
}

export async function getInvoiceForStore(storeId: string, invoiceId: number) {
  const [record] = await db
    .select()
    .from(invoice)
    .where(and(eq(invoice.id, invoiceId), eq(invoice.storeId, storeId)))

  if (!record) {
    return null
  }

  return syncInvoiceStatus(record, { always: true })
}

export async function getInvoiceByOrderIdForStore(storeId: string, orderId: string) {
  const [record] = await db
    .select()
    .from(invoice)
    .where(and(eq(invoice.storeId, storeId), eq(invoice.orderId, orderId)))

  if (!record) {
    return null
  }

  return syncInvoiceStatus(record, { always: true })
}

export async function cancelInvoiceForStore(storeId: string, invoiceId: number) {
  const record = await getInvoiceForStore(storeId, invoiceId)

  if (!record) {
    return null
  }

  if (record.status === 'Cancelled') {
    return record
  }

  if (NON_CANCELLABLE_STATUSES.includes(record.status)) {
    throw new HTTPException(400, {
      message: `Invoice cannot be cancelled while status is ${record.status}`,
    })
  }

  if (record.status === 'Received') {
    throw new HTTPException(400, {
      message: 'Invoice cannot be cancelled after payment has been received',
    })
  }

  if (!CANCELLABLE_STATUSES.includes(record.status)) {
    throw new HTTPException(400, { message: 'Invoice cannot be cancelled' })
  }

  if (!record.paymentHash) {
    throw new HTTPException(502, { message: 'Invoice is missing a payment hash' })
  }

  const fiberResult = await fiberRpc<FiberGetInvoiceResult>('cancel_invoice', [
    { payment_hash: record.paymentHash as FiberHexString },
  ])

  const fiberStatus = mapFiberStatus(fiberResult.status)

  if (fiberStatus !== 'Cancelled') {
    throw new HTTPException(502, {
      message: `Fiber cancel_invoice returned unexpected status: ${fiberResult.status}`,
    })
  }

  return applyFiberInvoiceState(record, fiberResult)
}
