import { Hono } from 'hono'

import {
  type CreateInvoiceInput,
  createInvoice,
  listInvoicesForStore,
} from '../../lib/invoice-service'
import { requireStoreForUser } from '../../lib/store'
import { type AuthVariables, requireAuth } from '../../middleware/auth'

export const invoiceRoutes = new Hono<{ Variables: AuthVariables }>()

invoiceRoutes.use('*', requireAuth)

invoiceRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  const storeId = c.req.param('storeId')

  await requireStoreForUser(storeId, userId)

  const invoices = await listInvoicesForStore(storeId)
  return c.json({ invoices })
})

invoiceRoutes.post('/', async (c) => {
  const userId = c.get('userId')
  const storeId = c.req.param('storeId')

  await requireStoreForUser(storeId, userId)

  const body = await c.req.json<Partial<CreateInvoiceInput>>()

  const created = await createInvoice(storeId, {
    amount: body.amount ?? '',
    amountInUSD: body.amountInUSD ?? -1,
    currency: body.currency ?? '',
    description: body.description,
    expirySeconds: body.expirySeconds,
    udtTypeScript: body.udtTypeScript,
    payment_preimage: body.payment_preimage,
    payment_hash: body.payment_hash,
    allow_mpp: body.allow_mpp,
    allow_trampoline_routing: body.allow_trampoline_routing,
  })

  return c.json({ invoice: created }, 201)
})
