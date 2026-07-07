import { Link, useRouterState } from '@tanstack/react-router'
import { FileText, Settings } from 'lucide-react'

import { StoreSwitcher } from '#/components/dashboard/store-switcher.tsx'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '#/components/ui/sidebar.tsx'
import type { StoreSummary } from '#/lib/stores-api.ts'

type AppSidebarProps = {
  store: StoreSummary
  stores: StoreSummary[]
}

export function AppSidebar({ store, stores }: AppSidebarProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const invoicesPath = `/dashboard/${store.slug}/invoices`
  const settingsPath = `/dashboard/${store.slug}/settings`
  const isInvoicesActive = pathname === invoicesPath || pathname === `/dashboard/${store.slug}`
  const isSettingsActive = pathname === settingsPath

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard/$storeSlug/invoices" params={{ storeSlug: store.slug }}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-sm font-semibold">FF</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">FiberFlow</span>
                  <span className="truncate text-xs text-muted-foreground">Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Store</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isInvoicesActive} tooltip="Invoices">
                  <Link to="/dashboard/$storeSlug/invoices" params={{ storeSlug: store.slug }}>
                    <FileText />
                    <span>Invoices</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isSettingsActive} tooltip="Settings">
                  <Link to="/dashboard/$storeSlug/settings" params={{ storeSlug: store.slug }}>
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <StoreSwitcher store={store} stores={stores} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
