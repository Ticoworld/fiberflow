import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Check, ChevronsUpDown, Plus, UserCog } from 'lucide-react'

import { StoreAvatar } from '#/components/dashboard/store-avatar.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '#/components/ui/sidebar.tsx'
import { cn } from '#/lib/utils.ts'
import type { StoreSummary } from '#/lib/stores-api.ts'

type StoreSwitcherProps = {
  store: StoreSummary
  stores: StoreSummary[]
}

export function StoreSwitcher({ store, stores }: StoreSwitcherProps) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const canSwitchStores = stores.length >= 2

  function switchToStore(targetSlug: string) {
    const nextPath = pathname.replace(
      `/dashboard/${store.slug}`,
      `/dashboard/${targetSlug}`,
    )
    void navigate({ to: nextPath })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <StoreAvatar store={store} className="rounded-lg" />
              {store.name}
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <StoreAvatar store={store} className="rounded-lg" />
                {store.name}
              </div>
            </DropdownMenuLabel>
            {canSwitchStores ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Stores
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {stores.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => switchToStore(item.slug)}
                      className="gap-2 p-2"
                    >
                      <StoreAvatar
                        store={item}
                        size="sm"
                        className="rounded-md"
                      />
                      <span className="truncate">{item.name}</span>
                      <Check
                        className={cn(
                          'ml-auto size-4',
                          item.id === store.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/onboarding" search={{ new: true }}>
                  <Plus />
                  New store
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  to="/dashboard/$storeSlug/user-settings"
                  params={{ storeSlug: store.slug }}
                >
                  <UserCog />
                  User settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
