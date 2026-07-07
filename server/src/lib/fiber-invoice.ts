/** Types for Fiber Network `new_invoice` RPC — aligned with nervosnetwork/fiber fiber-js. */

export type FiberRpcCurrency = 'Fibb' | 'Fibt' | 'Fibd'

export type FiberHexString = `0x${string}`

export type FiberHashAlgorithm = 'ckb_hash' | 'sha256'

export type FiberScript = {
  code_hash: FiberHexString
  hash_type: 'data' | 'type' | 'data1' | 'data2'
  args: string
}

export type FiberInvoiceAttribute =
  | { final_htlc_timeout: FiberHexString }
  | { final_htlc_minimum_expiry_delta: FiberHexString }
  | { expiry_time: FiberHexString }
  | { description: string }
  | { fallback_addr: string }
  | { udt_script: FiberHexString }
  | { payee_public_key: string }
  | { hash_algorithm: FiberHashAlgorithm }
  | { feature: FiberHexString }
  | { payment_secret: string }

export type FiberInvoiceData = {
  timestamp: FiberHexString
  payment_hash: FiberHexString
  attrs: FiberInvoiceAttribute[]
}

export type FiberCkbInvoice = {
  currency: FiberRpcCurrency
  amount?: FiberHexString
  signature?: string
  data: FiberInvoiceData
}

/** Result of the Fiber `new_invoice` RPC method. */
export type FiberNewInvoiceResult = {
  invoice_address: string
  invoice: FiberCkbInvoice
}

export type FiberInvoiceStatus =
  | 'Open'
  | 'Received'
  | 'Paid'
  | 'Expired'
  | 'Cancelled'

export type FiberGetInvoiceParams = {
  payment_hash: FiberHexString
}

/** Result of the Fiber `get_invoice` RPC method. */
export type FiberGetInvoiceResult = {
  invoice_address: string
  invoice: FiberCkbInvoice
  status: FiberInvoiceStatus
}

export type FiberNewInvoiceParams = {
  amount: FiberHexString
  currency: FiberRpcCurrency
  description?: string
  payment_preimage?: FiberHexString
  payment_hash?: FiberHexString
  expiry?: FiberHexString
  fallback_address?: string
  final_expiry_delta?: FiberHexString
  udt_type_script?: FiberScript
  hash_algorithm?: FiberHashAlgorithm
  allow_mpp?: boolean
  allow_trampoline_routing?: boolean
}

/** Encode an integer for Fiber JSON-RPC (requires `0x`-prefixed hex, no leading zeros). */
export function toFiberHexUInt(value: number | bigint | string): FiberHexString {
  const parsed = typeof value === 'bigint' ? value : BigInt(value)

  if (parsed < 0n) {
    throw new Error(`Fiber hex values must be non-negative: ${value}`)
  }

  return `0x${parsed.toString(16)}`
}

/** Parse a Fiber RPC u128/u64 hex (or decimal) string to a safe JS number. */
export function parseFiberHexUInt(value: string): number {
  const parsed = value.startsWith('0x') ? Number(BigInt(value)) : Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid Fiber numeric value: ${value}`)
  }

  return parsed
}

export function getInvoiceExpirySecondsFromAttrs(
  attrs: FiberInvoiceAttribute[],
): number | undefined {
  for (const attr of attrs) {
    if ('expiry_time' in attr) {
      return parseFiberHexUInt(attr.expiry_time)
    }
  }

  return undefined
}
