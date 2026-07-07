import { apiFetch } from '#/lib/api.ts'
import type { InvoiceCurrency } from '#/lib/invoices-api.ts'

export type FiberNetwork = 'mainnet' | 'testnet' | 'devnet'

export type FiberConfig = {
  fiberNetwork: FiberNetwork
  invoiceCurrency: InvoiceCurrency
  networkLabel: string
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: string }
    return body.message ?? body.error ?? response.statusText
  } catch {
    return response.statusText
  }
}

export async function fetchFiberConfig(): Promise<FiberConfig> {
  const response = await apiFetch('/api/config')

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as FiberConfig
}
