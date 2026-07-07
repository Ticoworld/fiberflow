import { apiFetch } from '#/lib/api.ts'

export type StoreSummary = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: string }
    return body.message ?? body.error ?? response.statusText
  } catch {
    return response.statusText
  }
}

export async function fetchStores(): Promise<StoreSummary[]> {
  const response = await apiFetch('/api/stores')

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { stores: StoreSummary[] }
  return data.stores
}

export async function createStore(name: string): Promise<StoreSummary> {
  const response = await apiFetch('/api/stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { store: StoreSummary }
  return data.store
}
