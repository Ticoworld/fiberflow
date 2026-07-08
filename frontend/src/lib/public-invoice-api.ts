import { apiUrl } from '#/lib/api.ts'

export type PublicInvoiceStatus =
  | 'open'
  | 'received'
  | 'paid'
  | 'expired'
  | 'cancelled'

export type PublicInvoice = {
  object: 'invoice'
  status: PublicInvoiceStatus
  amount_in_usd: number
  amount: string
  currency: string
  payment_hash: string | null
  invoice_address: string | null
  description: string | null
  expires_at: string
  success_url: string | null
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: string }
    return body.message ?? body.error ?? response.statusText
  } catch {
    return response.statusText
  }
}

export async function fetchPublicInvoice(paymentHash: string): Promise<PublicInvoice> {
  const response = await fetch(
    apiUrl(`/public/invoices/${encodeURIComponent(paymentHash)}`),
    { cache: 'no-store' },
  )

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { invoice: PublicInvoice }
  return data.invoice
}

export function formatPublicAmountInUsd(amountInUsd: number): string {
  return amountInUsd.toFixed(2)
}

export function formatPublicFiberAmount(amount: string): string {
  const shannons = amount.startsWith('0x') ? BigInt(amount) : BigInt(amount)
  const ckb = Number(shannons) / 100_000_000

  return `${ckb.toLocaleString(undefined, { maximumFractionDigits: 8 })} CKB`
}

export function formatPublicCurrency(currency: string): string {
  return currency.toUpperCase()
}

export function isAwaitingPayment(status: PublicInvoiceStatus): boolean {
  return status === 'open' || status === 'received'
}
