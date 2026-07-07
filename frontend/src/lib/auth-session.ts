import { authClient } from '#/lib/auth-client.ts'

export async function getAppSession() {
  if (import.meta.env.SSR) {
    const { getRequestHeader } = await import('@tanstack/react-start/server')
    const cookie = getRequestHeader('cookie')

    return authClient.getSession({
      fetchOptions: {
        credentials: 'include',
        headers: cookie ? { cookie } : undefined,
      },
    })
  }

  return authClient.getSession()
}
