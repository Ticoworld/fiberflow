import { apiFetch } from '#/lib/api.ts'

export type ApiKeySummary = {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
  lastUsedAt: string | null
}

export type CreatedApiKey = ApiKeySummary & {
  token: string
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: string }
    return body.message ?? body.error ?? response.statusText
  } catch {
    return response.statusText
  }
}

export async function fetchApiKeys(storeId: string): Promise<ApiKeySummary[]> {
  const response = await apiFetch(`/api/stores/${storeId}/api-keys`)

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { apiKeys: ApiKeySummary[] }
  return data.apiKeys
}

export async function createApiKey(
  storeId: string,
  name: string,
): Promise<CreatedApiKey> {
  const response = await apiFetch(`/api/stores/${storeId}/api-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { apiKey: CreatedApiKey }
  return data.apiKey
}

export async function deleteApiKey(storeId: string, id: string): Promise<void> {
  const response = await apiFetch(`/api/stores/${storeId}/api-keys/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}
