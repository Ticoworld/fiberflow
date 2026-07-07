import { Hono } from 'hono'

import { auth } from '../../lib/auth'
import { storeRoutes } from './stores'

/** Dashboard API — session auth, used by the FiberFlow frontend. */
export const dashboardRoutes = new Hono()

dashboardRoutes.all('/auth/*', (c) => auth.handler(c.req.raw))

dashboardRoutes.route('/stores', storeRoutes)
