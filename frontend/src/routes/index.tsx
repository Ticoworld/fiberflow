import { createFileRoute, redirect } from '@tanstack/react-router'

import { LandingPage } from '#/components/landing/landing-page.tsx'
import { getAppSession } from '#/lib/auth-session.ts'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { data } = await getAppSession()
    if (data?.user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  head: () => ({
    meta: [
      { title: 'FiberFlow — Accept Fiber payments' },
      {
        name: 'description',
        content:
          'Self-hosted invoices, checkout, and webhooks for Nervos Fiber — like Stripe Checkout for CKB.',
      },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  return <LandingPage />
}
