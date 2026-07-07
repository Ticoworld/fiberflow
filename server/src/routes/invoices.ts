import { desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { db } from '../db'
import { invoice } from '../db/schema'
import { fiberRpc } from '../fiber-rpc'
import { requireStoreForUser } from '../lib/store'
import { type AuthVariables, requireAuth } from '../middleware/auth'

type NewInvoiceBody = {
  amount?: string
  amountInUSD?: number
  currency?: string
  description?: string
  expirySeconds?: number
  udtTypeScript?: string
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

export const invoiceRoutes = new Hono<{ Variables: AuthVariables }>()

invoiceRoutes.use('*', requireAuth)

invoiceRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  const storeId = c.req.param('storeId')

  await requireStoreForUser(storeId, userId)

  const invoices = await db
    .select()
    .from(invoice)
    .where(eq(invoice.storeId, storeId))
    .orderBy(desc(invoice.createdAt))

  return c.json({ invoices })
})

invoiceRoutes.post('/', async (c) => {
  const userId = c.get('userId')
  const storeId = c.req.param('storeId')

  await requireStoreForUser(storeId, userId)

  const body = await c.req.json<NewInvoiceBody>()

  if (!body.amount?.trim()) {
    throw new HTTPException(400, { message: 'amount is required' })
  }

  if (!body.currency?.trim()) {
    throw new HTTPException(400, { message: 'currency is required' })
  }

  if (body.amountInUSD === undefined || body.amountInUSD < 0) {
    throw new HTTPException(400, { message: 'amountInUSD is required' })
  }

  const expirySeconds = body.expirySeconds ?? 3600

  const rpcParams: Record<string, unknown> = {
    amount: body.amount,
    currency: body.currency,
    expiry: expirySeconds,
  }

  if (body.description) rpcParams.description = body.description
  if (body.udtTypeScript) rpcParams.udt_type_script = body.udtTypeScript
  if (body.payment_preimage) rpcParams.payment_preimage = body.payment_preimage
  if (body.payment_hash) rpcParams.payment_hash = body.payment_hash
  if (body.allow_mpp !== undefined) rpcParams.allow_mpp = body.allow_mpp
  if (body.allow_trampoline_routing !== undefined) {
    rpcParams.allow_trampoline_routing = body.allow_trampoline_routing
  }

  const result = await fiberRpc<FiberInvoiceResult>('new_invoice', [rpcParams])
  const expiresAt = new Date(Date.now() + expirySeconds * 1000)

  const [created] = await db
    .insert(invoice)
    .values({
      paymentHash: result.invoice.data.payment_hash,
      invoiceAddress: result.invoice_address,
      amount: body.amount,
      amountInUSD: body.amountInUSD,
      currency: body.currency,
      description: body.description ?? null,
      expirySeconds,
      expiresAt,
      status: 'Open',
      udtTypeScript: body.udtTypeScript ?? null,
      storeId,
    })
    .returning()

  return c.json({ invoice: created }, 201)
})
