import { desc } from 'drizzle-orm'
import { Hono } from 'hono'

import { db } from '../db'
import { auth } from '../lib/auth'

export const apiRoutes = new Hono()

apiRoutes.on(['GET', 'POST'], '/auth/*', (c) => auth.handler(c.req.raw))




