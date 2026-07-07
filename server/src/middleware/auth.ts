import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

import { auth } from '../lib/auth'

export type AuthUser = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: Date
  updatedAt: Date
}

export type AuthVariables = {
  userId: string
  user: AuthUser
}

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!session?.user) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }

    c.set('userId', session.user.id)
    c.set('user', session.user as AuthUser)
    await next()
  },
)
