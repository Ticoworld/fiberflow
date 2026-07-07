import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const WEBHOOK_SECRET_PREFIX = 'whsec_'

export function generateWebhookSecret() {
  const randomPart = randomBytes(32).toString('base64url')
  return `${WEBHOOK_SECRET_PREFIX}${randomPart}`
}

export function signWebhookPayload(secret: string, timestamp: number, body: string): string {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex')
}

export function verifyWebhookSignature(
  secret: string,
  signatureHeader: string,
  body: string,
  toleranceSeconds = 300,
): boolean {
  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=')
    if (key && value) {
      acc[key.trim()] = value.trim()
    }
    return acc
  }, {})

  const timestamp = Number(parts.t)
  const signature = parts.v1

  if (!Number.isFinite(timestamp) || !signature) {
    return false
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp)
  if (age > toleranceSeconds) {
    return false
  }

  const expected = signWebhookPayload(secret, timestamp, body)

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

export function formatWebhookSignatureHeader(secret: string, body: string): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = signWebhookPayload(secret, timestamp, body)

  return `t=${timestamp},v1=${signature}`
}
