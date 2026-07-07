import { apiFetch } from '#/lib/api.ts'

export type InvoiceStatus = 'Open' | 'Received' | 'Paid' | 'Expired' | 'Cancelled'

export type InvoiceCurrency = 'fibb' | 'fibt' | 'fibd'

export type Invoice = {
  id: number
  amount: string
  currency: InvoiceCurrency
  amountInUSD: number
  description: string | null
  expirySeconds: number
  paymentHash: string | null
  invoiceAddress: string | null
  signature: string | null
  status: InvoiceStatus
  storeId: string | null
  orderId: string
  customerEmail: string
  createdAt: string
  updatedAt: string
}

export type CreateInvoiceInput = {
  amountInUSD: number
  orderId: string
  customerEmail: string
  description?: string
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: string }
    return body.message ?? body.error ?? response.statusText
  } catch {
    return response.statusText
  }
}

export async function fetchInvoices(storeId: string): Promise<Invoice[]> {
  const response = await apiFetch(`/api/stores/${encodeURIComponent(storeId)}/invoices`)

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { invoices: Invoice[] }
  return data.invoices
}

export async function createInvoice(
  storeId: string,
  input: CreateInvoiceInput,
): Promise<Invoice> {
  const response = await apiFetch(`/api/stores/${encodeURIComponent(storeId)}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })



  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { invoice: Invoice }
  return data.invoice
}

export function formatAmountInUsd(amountInUsdCents: number): string {
  return (amountInUsdCents / 100).toFixed(2)
}

export function formatInvoiceCurrency(currency: InvoiceCurrency): string {
  return currency.toUpperCase()
}

export function formatFiberAmount(amount: string): string {
  const shannons = amount.startsWith('0x') ? BigInt(amount) : BigInt(amount)
  const ckb = Number(shannons) / 100_000_000

  return `${ckb.toLocaleString(undefined, { maximumFractionDigits: 8 })} CKB`
}

export function getInvoiceExpiresAt(invoice: Invoice): Date {
  return new Date(new Date(invoice.createdAt).getTime() + invoice.expirySeconds * 1000)
}
