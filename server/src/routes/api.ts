import { Hono } from 'hono'

import { auth } from '../lib/auth'
import { storeRoutes } from './stores'

export const apiRoutes = new Hono()

apiRoutes.on(['GET', 'POST'], '/auth/*', (c) => auth.handler(c.req.raw))

apiRoutes.route('/stores', storeRoutes)
