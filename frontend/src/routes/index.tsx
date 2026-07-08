import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Button } from '#/components/ui/button.tsx'
import { getAppSession } from '#/lib/auth-session.ts'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { data } = await getAppSession()
    if (data?.user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="max-w-lg space-y-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          FiberFlow
        </h1>
        <p className="text-muted-foreground">
          Accept Fiber payments on your store with invoices, webhooks, and a
          merchant API.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/login">Sign in</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/signup">Create account</Link>
        </Button>
      </div>
    </div>
  )
}
