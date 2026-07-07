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
  expiresAt: string
  paymentHash: string | null
  invoiceAddress: string | null
  status: InvoiceStatus
  storeId: string | null
  orderId: string
  customerEmail: string
  createdAt: string
  updatedAt: string
}

export type CreateInvoiceInput = {
  amount: string
  amountInUSD: number
  orderId: string
  customerEmail: string
  description?: string
  expirySeconds?: number
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
