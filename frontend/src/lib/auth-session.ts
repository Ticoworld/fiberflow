import { getRequestCookieHeader } from '#/lib/request-cookie.ts'

import { authClient } from '#/lib/auth-client.ts'

export async function getAppSession() {
  const cookie = getRequestCookieHeader()

  if (!cookie) {
    return authClient.getSession()
  }

  return authClient.getSession({
    fetchOptions: {
      credentials: 'include',
      headers: { cookie },
    },
  })
}
