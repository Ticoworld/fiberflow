import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AppSidebar } from '#/components/dashboard/app-sidebar.tsx'
import { SidebarInset, SidebarProvider } from '#/components/ui/sidebar.tsx'
import { fetchStoreBySlug, fetchStores } from '#/lib/stores-api.ts'

export const Route = createFileRoute('/dashboard/$storeSlug')({
  loader: async ({ params }) => {
    try {
      const [store, stores] = await Promise.all([
        fetchStoreBySlug(params.storeSlug),
        fetchStores(),
      ])
      return { store, stores }
    } catch {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: StoreDashboardLayout,
})

function StoreDashboardLayout() {
  const { store, stores } = Route.useLoaderData()

  return (
    <SidebarProvider>
      <AppSidebar store={store} stores={stores} />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
