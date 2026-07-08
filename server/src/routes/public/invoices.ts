import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { getInvoiceByPaymentHash } from '../../lib/invoice-service'
import { serializePublicInvoice } from '../../lib/merchant-serializer'

const PAYMENT_HASH_PATTERN = /^0x[0-9a-fA-F]+$/

export const publicInvoiceRoutes = new Hono()

publicInvoiceRoutes.get('/:paymentHash', async (c) => {
  const paymentHash = decodeURIComponent(c.req.param('paymentHash'))

  if (!PAYMENT_HASH_PATTERN.test(paymentHash)) {
    throw new HTTPException(400, { message: 'Invalid payment hash' })
  }

  const record = await getInvoiceByPaymentHash(paymentHash)

  if (!record) {
    throw new HTTPException(404, { message: 'Invoice not found' })
  }

  c.header('Cache-Control', 'no-store')
  return c.json({ invoice: serializePublicInvoice(record) })
})
