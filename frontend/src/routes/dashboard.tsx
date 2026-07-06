import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AppSidebar } from '#/components/dashboard/app-sidebar.tsx'
import {
  SidebarInset,
  SidebarProvider,
} from '#/components/ui/sidebar.tsx'
import { authClient } from '#/lib/auth-client.ts'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const { data } = await authClient.getSession()
    if (!data?.user) {
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
