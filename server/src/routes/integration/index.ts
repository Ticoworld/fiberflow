import { Hono } from 'hono'

import { invoiceRoutes } from './invoices'

/** Integration API — API key auth, used by merchant backends. */
export const integrationRoutes = new Hono()

integrationRoutes.route('/invoices', invoiceRoutes)
