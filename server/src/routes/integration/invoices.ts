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
  beginIdempotentRequest,
  completeIdempotentRequest,
  hashRequestBody,
  normalizeIdempotencyKey,
  releaseIdempotentRequest,
} from '../../lib/idempotency'
import {
  apiError,
  fromHttpException,
  idempotencyConflict,
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
  const idempotencyKey = normalizeIdempotencyKey(c.req.header('Idempotency-Key'))
  const rawBodyText = await c.req.text()
  const requestHash = hashRequestBody(rawBodyText)

  let rawBody: Record<string, unknown>
  try {
    const parsed: unknown = rawBodyText ? JSON.parse(rawBodyText) : {}
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      invalidRequest('Request body must be a JSON object.', undefined, 'invalid_json')
    }
    rawBody = parsed as Record<string, unknown>
  } catch {
    invalidRequest('Malformed JSON in request body.', undefined, 'invalid_json')
  }

  const input = parseMerchantCreateInvoiceInput(rawBody)

  if (idempotencyKey) {
    const idempotency = await beginIdempotentRequest(storeId, idempotencyKey, requestHash)

    if (idempotency.action === 'conflict') {
      idempotencyConflict(
        'Idempotency-Key was used with a different request body.',
        'idempotency_key_mismatch',
      )
    }

    if (idempotency.action === 'replay') {
      return c.json(idempotency.body, idempotency.status as 201)
    }

    const created = await createMerchantInvoice(storeId, input, async () => {
      await releaseIdempotentRequest(storeId, idempotencyKey)
    })
    const body = { invoice: created }

    await completeIdempotentRequest(storeId, idempotencyKey, 201, body)

    return c.json(body, 201)
  }

  const created = await createMerchantInvoice(storeId, input)

  return c.json({ invoice: created }, 201)
})

async function createMerchantInvoice(
  storeId: string,
  input: Parameters<typeof createInvoice>[1],
  onFailure?: () => Promise<void>,
) {
  try {
    const created = await createInvoice(storeId, input)
    return serializeMerchantInvoice(created)
  } catch (error) {
    if (onFailure) {
      await onFailure()
    }

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
