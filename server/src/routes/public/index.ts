import { Hono } from 'hono'

import { publicInvoiceRoutes } from './invoices'

/** Public API — no auth, used by the hosted payment page. */
export const publicRoutes = new Hono()

publicRoutes.route('/invoices', publicInvoiceRoutes)
