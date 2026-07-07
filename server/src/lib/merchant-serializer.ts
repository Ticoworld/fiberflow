import type { Invoice, InvoiceStatus } from '../db/schema'
import type { CreateInvoiceInput } from './invoice-service'
import { invalidRequest } from './merchant-errors'

export type MerchantInvoiceStatus = 'open' | 'received' | 'paid' | 'expired' | 'cancelled'

export type MerchantInvoice = {
  object: 'invoice'
  id: number
  order_id: string
  status: MerchantInvoiceStatus
  amount_in_usd: number
  amount: string
  currency: string
  payment_hash: string | null
  invoice_address: string | null
  customer_email: string
  description: string | null
  expiry_seconds: number
  created_at: string
  updated_at: string
}

export type MerchantInvoiceList = {
  object: 'list'
  data: MerchantInvoice[]
  has_more: boolean
}

const MERCHANT_INVOICE_STATUSES = [
  'open',
  'received',
  'paid',
  'expired',
  'cancelled',
] as const satisfies readonly MerchantInvoiceStatus[]

const DB_STATUS_TO_MERCHANT: Record<InvoiceStatus, MerchantInvoiceStatus> = {
  Open: 'open',
  Received: 'received',
  Paid: 'paid',
  Expired: 'expired',
  Cancelled: 'cancelled',
}

const MERCHANT_STATUS_TO_DB: Record<MerchantInvoiceStatus, InvoiceStatus> = {
  open: 'Open',
  received: 'Received',
  paid: 'Paid',
  expired: 'Expired',
  cancelled: 'Cancelled',
}

export function toMerchantStatus(status: InvoiceStatus): MerchantInvoiceStatus {
  return DB_STATUS_TO_MERCHANT[status]
}

export function parseMerchantStatusFilter(
  value: string | undefined,
): InvoiceStatus | undefined {
  if (!value) {
    return undefined
  }

  const normalized = value.trim().toLowerCase()

  if (!(MERCHANT_INVOICE_STATUSES as readonly string[]).includes(normalized)) {
    invalidRequest(
      `Invalid status filter. Expected one of: ${MERCHANT_INVOICE_STATUSES.join(', ')}.`,
      'status',
      'invalid_status',
    )
  }

  return MERCHANT_STATUS_TO_DB[normalized as MerchantInvoiceStatus]
}

export function serializeMerchantInvoice(invoice: Invoice): MerchantInvoice {
  return {
    object: 'invoice',
    id: invoice.id,
    order_id: invoice.orderId,
    status: toMerchantStatus(invoice.status),
    amount_in_usd: invoice.amountInUSD / 100,
    amount: invoice.amount,
    currency: invoice.currency,
    payment_hash: invoice.paymentHash,
    invoice_address: invoice.invoiceAddress,
    customer_email: invoice.customerEmail,
    description: invoice.description,
    expiry_seconds: invoice.expirySeconds,
    created_at: invoice.createdAt.toISOString(),
    updated_at: invoice.updatedAt.toISOString(),
  }
}

export function serializeMerchantInvoiceList(
  invoices: Invoice[],
  hasMore: boolean,
): MerchantInvoiceList {
  return {
    object: 'list',
    data: invoices.map(serializeMerchantInvoice),
    has_more: hasMore,
  }
}

type MerchantCreateInvoiceBody = {
  amount_in_usd?: unknown
  order_id?: unknown
  customer_email?: unknown
  description?: unknown
}

export function parseMerchantCreateInvoiceInput(
  body: Partial<MerchantCreateInvoiceBody>,
): CreateInvoiceInput {
  const amountInUSD = parsePositiveNumber(body.amount_in_usd, 'amount_in_usd')
  const orderId = parseRequiredString(body.order_id, 'order_id')
  const customerEmail = parseRequiredString(body.customer_email, 'customer_email')
  const description = parseOptionalString(body.description)

  return {
    amountInUSD,
    orderId,
    customerEmail,
    description,
  }
}

export function parsePaginationLimit(value: string | undefined): number {
  if (!value) {
    return 25
  }

  const limit = Number(value)

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    invalidRequest('limit must be an integer between 1 and 100.', 'limit', 'invalid_limit')
  }

  return limit
}

export function parseStartingAfter(value: string | undefined): number | undefined {
  if (!value) {
    return undefined
  }

  const startingAfter = Number(value)

  if (!Number.isInteger(startingAfter) || startingAfter <= 0) {
    invalidRequest(
      'starting_after must be a positive integer invoice id.',
      'starting_after',
      'invalid_starting_after',
    )
  }

  return startingAfter
}

function parsePositiveNumber(value: unknown, param: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    invalidRequest(`${param} must be a number greater than 0.`, param, 'invalid_amount')
  }

  return value
}

function parseRequiredString(value: unknown, param: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    invalidRequest(`${param} is required.`, param, `missing_${param}`)
  }

  return value.trim()
}

function parseOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'string') {
    invalidRequest('description must be a string.', 'description', 'invalid_description')
  }

  return value.trim() || undefined
}
