import { createServer } from 'node:http'
import { createHmac, timingSafeEqual } from 'node:crypto'

const PORT = Number(process.env.PORT ?? 4242)
const WEBHOOK_SECRET = process.env.FIBERFLOW_WEBHOOK_SECRET

function verifyFiberFlowWebhook(rawBody, signatureHeader, secret) {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => part.trim().split('=')),
  )

  const timestamp = Number(parts.t)
  const signature = parts.v1

  if (!Number.isFinite(timestamp) || !signature) {
    return false
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp)
  if (age > 300) {
    return false
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []

    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }

  if (req.method !== 'POST' || req.url !== '/webhooks/fiberflow') {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  if (!WEBHOOK_SECRET) {
    res.writeHead(500)
    res.end('Missing FIBERFLOW_WEBHOOK_SECRET')
    return
  }

  const rawBody = await readBody(req)
  const signatureHeader = req.headers['x-fiberflow-signature']

  if (typeof signatureHeader !== 'string') {
    res.writeHead(400)
    res.end('Missing X-FiberFlow-Signature header')
    return
  }

  if (!verifyFiberFlowWebhook(rawBody, signatureHeader, WEBHOOK_SECRET)) {
    res.writeHead(400)
    res.end('Invalid signature')
    return
  }

  const event = JSON.parse(rawBody)

  console.log(`[webhook] ${event.type}`, {
    orderId: event.data?.order_id,
    status: event.data?.status,
    deliveryId: req.headers['x-fiberflow-delivery-id'],
  })

  if (event.type === 'invoice.paid') {
    console.log(`[fulfill] order ${event.data.order_id} paid ($${event.data.amount_in_usd})`)
  }

  res.writeHead(200)
  res.end('ok')
})

server.listen(PORT, () => {
  console.log(`FiberFlow webhook example listening on http://localhost:${PORT}/webhooks/fiberflow`)
})
