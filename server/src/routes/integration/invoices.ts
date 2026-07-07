import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import {
  type CreateInvoiceInput,
  createInvoice,
  getInvoiceForStore,
  listInvoicesForStore,
} from '../../lib/invoice-service'
import { type ApiKeyVariables, requireApiKey } from '../../middleware/api-key-auth'

export const invoiceRoutes = new Hono<{ Variables: ApiKeyVariables }>()

invoiceRoutes.use('*', requireApiKey)

invoiceRoutes.get('/', async (c) => {
  const storeId = c.get('storeId')
  const invoices = await listInvoicesForStore(storeId)
  return c.json({ invoices })
})

invoiceRoutes.get('/:id', async (c) => {
  const storeId = c.get('storeId')
  const invoiceId = Number(c.req.param('id'))

  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    throw new HTTPException(400, { message: 'Invalid invoice id' })
  }

  const record = await getInvoiceForStore(storeId, invoiceId)

  if (!record) {
    throw new HTTPException(404, { message: 'Invoice not found' })
  }

  return c.json({ invoice: record })
})

invoiceRoutes.post('/', async (c) => {
  const storeId = c.get('storeId')
  const body = await c.req.json<Partial<CreateInvoiceInput>>()

  const created = await createInvoice(storeId, {
    amountInUSD: body.amountInUSD ?? -1,
    orderId: body.orderId ?? '',
    customerEmail: body.customerEmail ?? '',
    description: body.description,
  })

  return c.json({ invoice: created }, 201)
})
