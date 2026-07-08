import type { Invoice, InvoiceStatus } from '../db/schema'
import type { CreateInvoiceInput } from './invoice-service'
import { invalidRequest } from './merchant-errors'
import { buildPaymentUrl } from './payment-url'

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
  payment_url: string | null
  customer_email: string
  description: string | null
  metadata: Record<string, string>
  success_url: string | null
  cancel_url: string | null
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
    payment_url: invoice.paymentHash ? buildPaymentUrl(invoice.paymentHash) : null,
    customer_email: invoice.customerEmail,
    description: invoice.description,
    metadata: invoice.metadata ?? {},
    success_url: invoice.successUrl,
    cancel_url: invoice.cancelUrl,
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

export type PublicInvoice = {
  object: 'invoice'
  status: MerchantInvoiceStatus
  amount_in_usd: number
  amount: string
  currency: string
  payment_hash: string | null
  invoice_address: string | null
  description: string | null
  expires_at: string
  success_url: string | null
}

export function getInvoiceExpiresAt(invoice: Invoice): string {
  return new Date(invoice.createdAt.getTime() + invoice.expirySeconds * 1000).toISOString()
}

export function serializePublicInvoice(invoice: Invoice): PublicInvoice {
  return {
    object: 'invoice',
    status: toMerchantStatus(invoice.status),
    amount_in_usd: invoice.amountInUSD / 100,
    amount: invoice.amount,
    currency: invoice.currency,
    payment_hash: invoice.paymentHash,
    invoice_address: invoice.invoiceAddress,
    description: invoice.description,
    expires_at: getInvoiceExpiresAt(invoice),
    success_url: invoice.successUrl,
  }
}

type MerchantCreateInvoiceBody = {
  amount_in_usd?: unknown
  order_id?: unknown
  customer_email?: unknown
  description?: unknown
  metadata?: unknown
  success_url?: unknown
  cancel_url?: unknown
}

export function parseMerchantCreateInvoiceInput(
  body: Partial<MerchantCreateInvoiceBody>,
): CreateInvoiceInput {
  const amountInUSD = parsePositiveNumber(body.amount_in_usd, 'amount_in_usd')
  const orderId = parseRequiredString(body.order_id, 'order_id')
  const customerEmail = parseRequiredString(body.customer_email, 'customer_email')
  const description = parseOptionalString(body.description, 'description')
  const metadata = parseMetadata(body.metadata)
  const successUrl = parseOptionalUrl(body.success_url, 'success_url')
  const cancelUrl = parseOptionalUrl(body.cancel_url, 'cancel_url')

  return {
    amountInUSD,
    orderId,
    customerEmail,
    description,
    metadata,
    successUrl,
    cancelUrl,
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

function parseOptionalString(value: unknown, param: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'string') {
    invalidRequest(`${param} must be a string.`, param, `invalid_${param}`)
  }

  return value.trim() || undefined
}

const MAX_METADATA_KEYS = 50
const MAX_METADATA_KEY_LENGTH = 40
const MAX_METADATA_VALUE_LENGTH = 500

function parseMetadata(value: unknown): Record<string, string> | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    invalidRequest('metadata must be an object.', 'metadata', 'invalid_metadata')
  }

  const entries = Object.entries(value as Record<string, unknown>)

  if (entries.length > MAX_METADATA_KEYS) {
    invalidRequest(
      `metadata must have ${MAX_METADATA_KEYS} keys or fewer.`,
      'metadata',
      'invalid_metadata',
    )
  }

  const metadata: Record<string, string> = {}

  for (const [key, entryValue] of entries) {
    if (!key.trim()) {
      invalidRequest('metadata keys must be non-empty strings.', 'metadata', 'invalid_metadata')
    }

    if (key.length > MAX_METADATA_KEY_LENGTH) {
      invalidRequest(
        `metadata key '${key}' exceeds ${MAX_METADATA_KEY_LENGTH} characters.`,
        'metadata',
        'invalid_metadata',
      )
    }

    if (typeof entryValue !== 'string') {
      invalidRequest(`metadata value for '${key}' must be a string.`, 'metadata', 'invalid_metadata')
    }

    if (entryValue.length > MAX_METADATA_VALUE_LENGTH) {
      invalidRequest(
        `metadata value for '${key}' exceeds ${MAX_METADATA_VALUE_LENGTH} characters.`,
        'metadata',
        'invalid_metadata',
      )
    }

    metadata[key] = entryValue
  }

  return metadata
}

function parseOptionalUrl(value: unknown, param: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'string') {
    invalidRequest(`${param} must be a string.`, param, `invalid_${param}`)
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  let parsed: URL

  try {
    parsed = new URL(trimmed)
  } catch {
    invalidRequest(`${param} must be a valid URL.`, param, `invalid_${param}`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    invalidRequest(`${param} must use http or https.`, param, `invalid_${param}`)
  }

  return trimmed
}
