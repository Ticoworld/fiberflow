import { Hono } from 'hono'

import { auth } from '../../lib/auth'
import {
  formatNetworkLabel,
  getFiberNetwork,
  getInvoiceCurrencyForNetwork,
} from '../../lib/fiber-network'
import { storeRoutes } from './stores'

/** Dashboard API — session auth, used by the FiberFlow frontend. */
export const dashboardRoutes = new Hono()

dashboardRoutes.all('/auth/*', (c) => auth.handler(c.req.raw))

dashboardRoutes.get('/config', (c) => {
  const fiberNetwork = getFiberNetwork()

  return c.json({
    fiberNetwork,
    invoiceCurrency: getInvoiceCurrencyForNetwork(fiberNetwork),
    networkLabel: formatNetworkLabel(fiberNetwork),
  })
})

dashboardRoutes.route('/stores', storeRoutes)
