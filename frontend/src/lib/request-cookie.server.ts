import '@tanstack/react-start/server-only'

import { getRequestHeader } from '@tanstack/react-start/server'

export function readRequestCookieHeader(): string | undefined {
  return getRequestHeader('cookie')
}
