import { and, desc, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'

import { db } from '../db'
import { invoice } from '../db/schema'
import { fiberRpc } from '../fiber-rpc'
import {
  type FiberNewInvoiceParams,
  type FiberNewInvoiceResult,
  getInvoiceExpirySecondsFromAttrs,
  toFiberHexUInt,
} from './fiber-invoice'
import { formatRpcCurrency, getInvoiceCurrency } from './fiber-network'
import { syncInvoiceStatus, syncInvoices } from './invoice-sync'
import { usdToCents, usdToShannons } from './invoice-amount'

const DEFAULT_EXPIRY_SECONDS = 7884000 // 91 days

export type CreateInvoiceInput = {
  amountInUSD: number
  orderId: string
  customerEmail: string
  description?: string
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
    })
    .returning()

  return created
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

  return syncInvoiceStatus(record)
}
