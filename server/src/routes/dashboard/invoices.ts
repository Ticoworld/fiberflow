import { Hono, type Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

import {
  type CreateInvoiceInput,
  createInvoice,
  listInvoicesForStore,
} from '../../lib/invoice-service'
import { requireStoreForUser } from '../../lib/store'
import { type AuthVariables, requireAuth } from '../../middleware/auth'

type InvoiceRouteEnv = {
  Variables: AuthVariables
  Param: {
    storeId: string
  }
}

function getStoreId(c: Context<InvoiceRouteEnv>): string {
  const storeId = c.req.param('storeId')

  if (!storeId) {
    throw new HTTPException(400, { message: 'Store ID is required' })
  }

  return storeId
}

export const invoiceRoutes = new Hono<InvoiceRouteEnv>()

invoiceRoutes.use('*', requireAuth)

invoiceRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  const storeId = getStoreId(c)

  await requireStoreForUser(storeId, userId)

  const invoices = await listInvoicesForStore(storeId)
  return c.json({ invoices })
})

invoiceRoutes.post('/', async (c) => {
  const userId = c.get('userId')
  const storeId = getStoreId(c)

  await requireStoreForUser(storeId, userId)

  const body = await c.req.json<Partial<CreateInvoiceInput>>()

  const created = await createInvoice(storeId, {
    amount: body.amount ?? '',
    amountInUSD: body.amountInUSD ?? -1,
    orderId: body.orderId ?? '',
    customerEmail: body.customerEmail ?? '',
    description: body.description,
    expirySeconds: body.expirySeconds,
    payment_preimage: body.payment_preimage,
    payment_hash: body.payment_hash,
    allow_mpp: body.allow_mpp,
    allow_trampoline_routing: body.allow_trampoline_routing,
  })

  return c.json({ invoice: created }, 201)
})
