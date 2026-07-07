import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

import { type ResolvedApiKey, resolveApiKey } from '../lib/api-key-auth'

export type ApiKeyVariables = {
  storeId: string
  apiKey: ResolvedApiKey
}

function extractBearerToken(authorization: string | undefined) {
  if (!authorization) {
    return null
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

export const requireApiKey = createMiddleware<{ Variables: ApiKeyVariables }>(
  async (c, next) => {
    const token = extractBearerToken(c.req.header('Authorization'))

    if (!token) {
      throw new HTTPException(401, {
        message: 'Missing or invalid Authorization header',
      })
    }

    const apiKey = await resolveApiKey(token)

    if (!apiKey) {
      throw new HTTPException(401, { message: 'Invalid API key' })
    }

    c.set('storeId', apiKey.storeId)
    c.set('apiKey', apiKey)
    await next()
  },
)
