import { apiFetch } from '#/lib/api.ts'

export type StoreWebhook = {
  id: string
  name: string
  url: string
  secret: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type WebhookLog = {
  id: string
  eventType: string
  payload: {
    id: string
    type: string
    created_at: string
    data: {
      invoice_id: number
      order_id: string
      payment_hash: string | null
      amount_in_usd: number
      status: string
      customer_email: string
      metadata: Record<string, string>
      success_url: string | null
      cancel_url: string | null
      payment_url: string | null
    }
  }
  status: 'pending' | 'succeeded' | 'failed'
  httpStatus: number | null
  responseBody: string | null
  attempt: number
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

export async function fetchStoreWebhooks(storeId: string): Promise<StoreWebhook[]> {
  const response = await apiFetch(`/api/stores/${encodeURIComponent(storeId)}/webhooks`)

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { webhooks: StoreWebhook[] }
  return data.webhooks
}

export async function fetchStoreWebhook(
  storeId: string,
  webhookId: string,
): Promise<StoreWebhook> {
  const response = await apiFetch(
    `/api/stores/${encodeURIComponent(storeId)}/webhooks/${encodeURIComponent(webhookId)}`,
  )

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { webhook: StoreWebhook }
  return data.webhook
}

export async function createStoreWebhook(
  storeId: string,
  input: { name: string; url: string; enabled?: boolean },
): Promise<StoreWebhook> {
  const response = await apiFetch(`/api/stores/${encodeURIComponent(storeId)}/webhooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { webhook: StoreWebhook }
  return data.webhook
}

export async function updateStoreWebhook(
  storeId: string,
  webhookId: string,
  input: { name?: string; url?: string; enabled?: boolean },
): Promise<StoreWebhook> {
  const response = await apiFetch(
    `/api/stores/${encodeURIComponent(storeId)}/webhooks/${encodeURIComponent(webhookId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { webhook: StoreWebhook }
  return data.webhook
}

export async function rotateStoreWebhookSecret(
  storeId: string,
  webhookId: string,
): Promise<StoreWebhook> {
  const response = await apiFetch(
    `/api/stores/${encodeURIComponent(storeId)}/webhooks/${encodeURIComponent(webhookId)}/rotate-secret`,
    { method: 'POST' },
  )

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { webhook: StoreWebhook }
  return data.webhook
}

export async function fetchWebhookLogs(
  storeId: string,
  webhookId: string,
): Promise<WebhookLog[]> {
  const response = await apiFetch(
    `/api/stores/${encodeURIComponent(storeId)}/webhooks/${encodeURIComponent(webhookId)}/logs`,
  )

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  const data = (await response.json()) as { logs: WebhookLog[] }
  return data.logs
}

export async function deleteStoreWebhook(storeId: string, webhookId: string): Promise<void> {
  const response = await apiFetch(
    `/api/stores/${encodeURIComponent(storeId)}/webhooks/${encodeURIComponent(webhookId)}`,
    { method: 'DELETE' },
  )

  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}
