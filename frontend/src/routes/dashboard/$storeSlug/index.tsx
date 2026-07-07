import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/$storeSlug/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/dashboard/$storeSlug/invoices',
      params: { storeSlug: params.storeSlug },
    })
  },
})
