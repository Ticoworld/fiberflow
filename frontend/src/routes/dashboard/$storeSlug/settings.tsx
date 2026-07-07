import { createFileRoute, getRouteApi } from '@tanstack/react-router'

import { DashboardHeader } from '#/components/dashboard/dashboard-header.tsx'
import { StoreApiKeysCard } from '#/components/dashboard/store-api-keys-card.tsx'
import { StoreDetailsCard } from '#/components/dashboard/store-details-card.tsx'
import { fetchApiKeys } from '#/lib/api-keys-api.ts'
import { fetchStoreBySlug } from '#/lib/stores-api.ts'

const storeRouteApi = getRouteApi('/dashboard/$storeSlug')

export const Route = createFileRoute('/dashboard/$storeSlug/settings')({
  loader: async ({ params }) => {
    const store = await fetchStoreBySlug(params.storeSlug)
    const apiKeys = await fetchApiKeys(store.id)
    return { apiKeys }
  },
  component: StoreSettingsPage,
})

function StoreSettingsPage() {
  const { store } = storeRouteApi.useLoaderData()
  const { apiKeys } = Route.useLoaderData()

  return (
    <>
      <DashboardHeader
        title="Settings"
        description={`Manage store details for ${store.name}`}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <StoreDetailsCard store={store} />
        <StoreApiKeysCard storeId={store.id} apiKeys={apiKeys} />
      </div>
    </>
  )
}
