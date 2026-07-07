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
  | { FinalHtlcMinimumExpiryDelta: FiberHexString }
  | { ExpiryTime: FiberHexString }
  | { Description: string }
  | { FallbackAddr: string }
  | { UdtScript: FiberHexString }
  | { PayeePublicKey: string }
  | { HashAlgorithm: number }
  | { Feature: FiberHexString }

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

export type FiberNewInvoiceParams = {
  amount: string | FiberHexString
  currency: FiberRpcCurrency
  description?: string
  payment_preimage?: FiberHexString
  payment_hash?: FiberHexString
  expiry?: number
  fallback_address?: string
  final_expiry_delta?: number
  udt_type_script?: FiberScript
  hash_algorithm?: FiberHashAlgorithm
  allow_mpp?: boolean
  allow_trampoline_routing?: boolean
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
    if ('ExpiryTime' in attr) {
      return parseFiberHexUInt(attr.ExpiryTime)
    }
  }

  return undefined
}
