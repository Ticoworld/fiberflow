import { createFileRoute, redirect } from '@tanstack/react-router'

import { fetchStores } from '#/lib/stores-api.ts'

export const Route = createFileRoute('/dashboard/')({
  beforeLoad: async () => {
    const stores = await fetchStores()

    if (stores.length === 0) {
      throw redirect({ to: '/onboarding' })
    }

    throw redirect({
      to: '/dashboard/$storeSlug/invoices',
      params: { storeSlug: stores[0].slug },
    })
  },
})
