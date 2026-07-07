import { createIsomorphicFn } from '@tanstack/react-start'

import { readRequestCookieHeader } from '#/lib/request-cookie.server.ts'

export const getRequestCookieHeader = createIsomorphicFn()
  .client((): string | undefined => undefined)
  .server((): string | undefined => readRequestCookieHeader())
