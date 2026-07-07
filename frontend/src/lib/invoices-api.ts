import { apiFetch } from '#/lib/api.ts'

export type InvoiceStatus = 'Open' | 'Received' | 'Paid' | 'Expired' | 'Cancelled'

export type Invoice = {
  id: number
  paymentHash: string
  invoiceAddress: string
  amount: string
  amountInUSD: number
  currency: string
  description: string | null
  expirySeconds: number
  expiresAt: string
  status: InvoiceStatus
  udtTypeScript: string | null
  storeId: string | null
  createdAt: string
  updatedAt: string
}

export type CreateInvoiceInput = {
  amount: string
  amountInUSD?: number
  currency: string
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
    body: JSON.stringify({
      amountInUSD: 0,
      ...input,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { invoice: Invoice }
  return data.invoice
}
