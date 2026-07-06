import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button.tsx'
import { authClient } from '#/lib/auth-client.ts'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const { data: session, isPending } = authClient.useSession()
  const user = session?.user

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Fiberflow Gateway</h1>
          {isPending ? (
            <p className="text-muted-foreground">Loading session...</p>
          ) : user ? (
            <p>
              Signed in as <span className="font-medium">{user.name}</span> (
              {user.email})
            </p>
          ) : (
            <p>You are not signed in.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {user ? (
            <Button
              variant="outline"
              onClick={async () => {
                await authClient.signOut()
              }}
            >
              Sign out
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>

        <div className="font-mono text-xs text-muted-foreground">
          (Press <kbd>d</kbd> to toggle dark mode)
        </div>
      </div>
    </div>
  )
}
