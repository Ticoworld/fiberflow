import { createServer } from 'node:http'
import crypto from 'node:crypto'

const secret = process.env.FIBERFLOW_WEBHOOK_SECRET
const port = Number(process.env.PORT || 8787)

if (!secret) {
  console.error('Set FIBERFLOW_WEBHOOK_SECRET to your dashboard webhook secret (whsec_...).')
  process.exit(1)
}

function verifyFiberFlowWebhook(rawBody, signatureHeader, webhookSecret) {
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

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    )
  } catch {
    return false
  }
}

const server = createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhooks/fiberflow') {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  const rawBody = Buffer.concat(chunks).toString('utf8')
  const signatureHeader = req.headers['x-fiberflow-signature']
  const eventType = req.headers['x-fiberflow-event']
  const deliveryId = req.headers['x-fiberflow-delivery-id']

  if (typeof signatureHeader !== 'string' || !verifyFiberFlowWebhook(rawBody, signatureHeader, secret)) {
    res.writeHead(401)
    res.end('Invalid signature')
    return
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    res.writeHead(400)
    res.end('Invalid JSON')
    return
  }

  console.log('[fiberflow webhook]', {
    deliveryId,
    eventType,
    type: payload.type,
    orderId: payload.data?.order_id,
    status: payload.data?.status,
  })

  if (payload.type === 'invoice.paid') {
    // Fulfill the order here (mark paid, ship, unlock download, etc.)
    console.log('Payment confirmed for order', payload.data?.order_id)
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ received: true }))
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Listening on http://127.0.0.1:${port}/webhooks/fiberflow`)
})
