const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function apiUrl(path: string): string {
  return `${API_URL}${path}`
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), {
    credentials: 'include',
    ...init,
  })
}
