import { Hono } from 'hono'

import { merchantErrorHandler } from '../../middleware/merchant-errors'
import { invoiceRoutes } from './invoices'

/** Integration API — API key auth, used by merchant backends. */
export const integrationRoutes = new Hono()

integrationRoutes.onError(merchantErrorHandler)
integrationRoutes.route('/invoices', invoiceRoutes)
