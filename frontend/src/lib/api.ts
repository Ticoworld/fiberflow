import { getRequestCookieHeader } from '#/lib/request-cookie.ts'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function apiUrl(path: string): string {
  return `${API_URL}${path}`
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookie = getRequestCookieHeader()
  const headers = new Headers(init?.headers)

  if (cookie) {
    headers.set('cookie', cookie)
  }

  return fetch(apiUrl(path), {
    credentials: 'include',
    ...init,
    headers,
  })
}
