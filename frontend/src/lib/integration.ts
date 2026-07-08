import { apiUrl } from '#/lib/api.ts'

export const MERCHANT_INTEGRATION_DOC_PATH = 'docs/MERCHANT_INTEGRATION.md'

export function getMerchantApiBaseUrl(): string {
  return apiUrl('/v1')
}

export const WEBHOOK_VERIFY_NODE_SNIPPET = `import crypto from 'node:crypto'

export function verifyFiberFlowWebhook(rawBody, signatureHeader, secret) {
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
    .createHmac('sha256', secret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex'),
  )
}`

export function buildCreateInvoiceCurl(apiKey: string): string {
  const baseUrl = getMerchantApiBaseUrl()

  return `curl -X POST ${baseUrl}/invoices \\
  -H "Authorization: Bearer ${apiKey || 'ffg_YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount_in_usd": 29.99,
    "order_id": "order_123",
    "customer_email": "buyer@example.com",
    "success_url": "https://your-store.com/thanks?order=order_123"
  }'`
}
