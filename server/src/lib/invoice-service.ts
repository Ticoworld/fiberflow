import { and, desc, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'

import { db } from '../db'
import { invoice } from '../db/schema'
import { fiberRpc } from '../fiber-rpc'
import { formatRpcCurrency, getInvoiceCurrency } from './fiber-network'

export type CreateInvoiceInput = {
  amount: string
  amountInUSD: number
  orderId: string
  customerEmail: string
  description?: string
  expirySeconds?: number
  payment_preimage?: string
  payment_hash?: string
  allow_mpp?: boolean
  allow_trampoline_routing?: boolean
}

type FiberInvoiceResult = {
  invoice_address: string
  invoice: {
    data: {
      payment_hash: string
    }
  }
}

export function validateCreateInvoiceInput(body: Partial<CreateInvoiceInput>) {
  if (!body.amount?.trim()) {
    throw new HTTPException(400, { message: 'amount is required' })
  }

  if (body.amountInUSD === undefined || body.amountInUSD < 0) {
    throw new HTTPException(400, { message: 'amountInUSD is required' })
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
  const expirySeconds = body.expirySeconds ?? 7884000 // 91 days

  const rpcParams: Record<string, unknown> = {
    amount: body.amount,
    currency: formatRpcCurrency(currency),
    expiry: expirySeconds,
  }

  if (body.description) rpcParams.description = body.description
  if (body.payment_preimage) rpcParams.payment_preimage = body.payment_preimage
  if (body.payment_hash) rpcParams.payment_hash = body.payment_hash
  if (body.allow_mpp !== undefined) rpcParams.allow_mpp = body.allow_mpp
  if (body.allow_trampoline_routing !== undefined) {
    rpcParams.allow_trampoline_routing = body.allow_trampoline_routing
  }

  const result = await fiberRpc<FiberInvoiceResult>('new_invoice', [rpcParams])

  const [created] = await db
    .insert(invoice)
    .values({
      paymentHash: result.invoice.data.payment_hash,
      invoiceAddress: result.invoice_address,
      amount: body.amount,
      amountInUSD: body.amountInUSD,
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
  return db
    .select()
    .from(invoice)
    .where(eq(invoice.storeId, storeId))
    .orderBy(desc(invoice.createdAt))
}

export async function getInvoiceForStore(storeId: string, invoiceId: number) {
  const [record] = await db
    .select()
    .from(invoice)
    .where(and(eq(invoice.id, invoiceId), eq(invoice.storeId, storeId)))

  return record ?? null
}
