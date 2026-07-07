import { Hono } from 'hono'

import { auth } from '../../lib/auth'
import { storeRoutes } from './stores'

/** Dashboard API — session auth, used by the Fiberflow frontend. */
export const dashboardRoutes = new Hono()

dashboardRoutes.on(['GET', 'POST'], '/auth/*', (c) => auth.handler(c.req.raw))

dashboardRoutes.route('/stores', storeRoutes)
