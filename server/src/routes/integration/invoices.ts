import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { FiberRpcError } from '../../fiber-rpc'

import {
  cancelInvoiceForStore,
  createInvoice,
  getInvoiceByOrderIdForStore,
  getInvoiceForStore,
  listInvoicesForStorePaginated,
} from '../../lib/invoice-service'
import {
  apiError,
  fromHttpException,
  invalidRequest,
  isUniqueViolation,
  MerchantApiException,
  notFound,
} from '../../lib/merchant-errors'
import {
  parseMerchantCreateInvoiceInput,
  parseMerchantStatusFilter,
  parsePaginationLimit,
  parseStartingAfter,
  serializeMerchantInvoice,
  serializeMerchantInvoiceList,
} from '../../lib/merchant-serializer'
import { type ApiKeyVariables, requireApiKey } from '../../middleware/api-key-auth'

export const invoiceRoutes = new Hono<{ Variables: ApiKeyVariables }>()

invoiceRoutes.use('*', requireApiKey)

invoiceRoutes.get('/', async (c) => {
  const storeId = c.get('storeId')
  const limit = parsePaginationLimit(c.req.query('limit'))
  const startingAfter = parseStartingAfter(c.req.query('starting_after'))
  const status = parseMerchantStatusFilter(c.req.query('status'))

  const result = await listInvoicesForStorePaginated(storeId, {
    limit,
    startingAfter,
    status,
  })

  return c.json(serializeMerchantInvoiceList(result.invoices, result.hasMore))
})

invoiceRoutes.get('/by-order/:orderId', async (c) => {
  const storeId = c.get('storeId')
  const orderId = c.req.param('orderId')?.trim()

  if (!orderId) {
    invalidRequest('order_id is required.', 'order_id', 'missing_order_id')
  }

  const record = await getInvoiceByOrderIdForStore(storeId, orderId)

  if (!record) {
    notFound('Invoice not found.', 'invoice_not_found')
  }

  return c.json({ invoice: serializeMerchantInvoice(record) })
})

invoiceRoutes.get('/:id', async (c) => {
  const storeId = c.get('storeId')
  const invoiceId = Number(c.req.param('id'))

  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    invalidRequest('Invalid invoice id.', 'id', 'invalid_invoice_id')
  }

  const record = await getInvoiceForStore(storeId, invoiceId)

  if (!record) {
    notFound('Invoice not found.', 'invoice_not_found')
  }

  return c.json({ invoice: serializeMerchantInvoice(record) })
})

invoiceRoutes.post('/:id/cancel', async (c) => {
  const storeId = c.get('storeId')
  const invoiceId = Number(c.req.param('id'))

  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    invalidRequest('Invalid invoice id.', 'id', 'invalid_invoice_id')
  }

  const cancelled = await cancelMerchantInvoice(storeId, invoiceId)

  if (!cancelled) {
    notFound('Invoice not found.', 'invoice_not_found')
  }

  return c.json({ invoice: cancelled })
})

invoiceRoutes.post('/', async (c) => {
  const storeId = c.get('storeId')

  let rawBody: Record<string, unknown>
  try {
    const parsed: unknown = await c.req.json()
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      invalidRequest('Request body must be a JSON object.', undefined, 'invalid_json')
    }
    rawBody = parsed as Record<string, unknown>
  } catch {
    invalidRequest('Malformed JSON in request body.', undefined, 'invalid_json')
  }

  const input = parseMerchantCreateInvoiceInput(rawBody)
  const created = await createMerchantInvoice(storeId, input)

  return c.json({ invoice: created }, 201)
})

async function createMerchantInvoice(
  storeId: string,
  input: Parameters<typeof createInvoice>[1],
) {
  try {
    const created = await createInvoice(storeId, input)
    return serializeMerchantInvoice(created)
  } catch (error) {
    if (error instanceof MerchantApiException) {
      throw error
    }

    if (error instanceof HTTPException) {
      throw fromHttpException(error)
    }

    if (error instanceof FiberRpcError) {
      apiError(error.message, 'fiber_rpc_error')
    }

    if (isUniqueViolation(error)) {
      invalidRequest(
        `An invoice with order_id '${input.orderId}' already exists.`,
        'order_id',
        'order_id_already_exists',
      )
    }

    throw error
  }
}

async function cancelMerchantInvoice(storeId: string, invoiceId: number) {
  try {
    const cancelled = await cancelInvoiceForStore(storeId, invoiceId)

    if (!cancelled) {
      return null
    }

    return serializeMerchantInvoice(cancelled)
  } catch (error) {
    if (error instanceof MerchantApiException) {
      throw error
    }

    if (error instanceof HTTPException) {
      throw fromHttpException(error)
    }

    if (error instanceof FiberRpcError) {
      apiError(error.message, 'fiber_rpc_error')
    }

    throw error
  }
}
