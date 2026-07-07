import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { getAppSession } from '#/lib/auth-session.ts'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const { data } = await getAppSession()
    if (!data?.user) {
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <div className="min-h-svh bg-background">
      <Outlet />
    </div>
  )
}
