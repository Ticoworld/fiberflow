import { apiFetch } from '#/lib/api.ts'

export type StoreSummary = {
  id: string
  name: string
  slug: string
  logo: string | null
  createdAt: string
  updatedAt: string
}

export type CreateStoreInput = {
  name: string
  slug?: string
}

export type UpdateStoreInput = {
  name?: string
  slug?: string
  logo?: string | null
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

export async function fetchStoreBySlug(slug: string): Promise<StoreSummary> {
  const response = await apiFetch(`/api/stores/slug/${encodeURIComponent(slug)}`)

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { store: StoreSummary }
  return data.store
}

export async function createStore(input: CreateStoreInput): Promise<StoreSummary> {
  const response = await apiFetch('/api/stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { store: StoreSummary }
  return data.store
}

export async function updateStore(
  storeId: string,
  input: UpdateStoreInput,
): Promise<StoreSummary> {
  const response = await apiFetch(`/api/stores/${encodeURIComponent(storeId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { store: StoreSummary }
  return data.store
}

export function slugifyStoreName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)

  return slug.length > 0 ? slug : 'store'
}
