import { createFileRoute, redirect } from '@tanstack/react-router'

import { fetchStoreBySlug } from '#/lib/stores-api.ts'

export const Route = createFileRoute('/dashboard/$storeSlug')({
  loader: async ({ params }) => {
    try {
      const store = await fetchStoreBySlug(params.storeSlug)
      return { store }
    } catch {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: StoreDashboardPage,
})

function StoreDashboardPage() {
  const { store } = Route.useLoaderData()

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Store dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight">{store.name}</h1>
        <p className="text-muted-foreground">
          You are viewing <span className="font-medium text-foreground">/dashboard/{store.slug}</span>
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">
          Your store is ready. Payment settings, API keys, and invoices will live here next.
        </p>
      </div>
    </div>
  )
}
