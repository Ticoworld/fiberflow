import { createHash, randomBytes } from 'crypto'

const API_KEY_PREFIX = 'ffg_'

export function generateApiKey() {
  const randomPart = randomBytes(32).toString('base64url')
  const rawKey = `${API_KEY_PREFIX}${randomPart}`
  const prefix = `${API_KEY_PREFIX}${randomPart.slice(0, 8)}`

  return {
    rawKey,
    prefix,
    hash: hashApiKey(rawKey),
  }
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}
