import { createFileRoute, useRouter } from '@tanstack/react-router'

import { apiFetch } from '#/lib/api'

type Todo = {
  id: number
  title: string
}

async function getTodos(): Promise<Todo[] | undefined> {
  const response = await apiFetch('/api/todos')
  if (!response.ok) {
    return undefined
  }
  return response.json()
}

export const Route = createFileRoute('/demo/neon')({
  component: App,
  loader: async () => {
    const todos = await getTodos()
    return { todos }
  },
})

function App() {
  const { todos } = Route.useLoaderData()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const data = Object.fromEntries(formData)

    await apiFetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: data.title }),
    })

    router.invalidate()
  }

  return (
    <main className="demo-page demo-center">
      <section className="demo-panel w-full max-w-2xl">
        <header className="mb-8 flex items-center gap-4">
          <span className="demo-card flex h-14 w-14 items-center justify-center p-3">
            <img src="/demo-neon.svg" alt="Neon Logo" className="h-8 w-8" />
          </span>
          <div>
            <p className="island-kicker mb-2">Database</p>
            <h1 className="demo-title">Neon Demo</h1>
          </div>
        </header>

        {todos === undefined ? (
          <div className="demo-alert demo-alert-danger mb-6">
            <p className="text-sm">
              Could not reach the gateway API. Start the server with{' '}
              <code>./start.sh</code> and set <code>VITE_API_URL</code> in{' '}
              <code>frontend/.env.local</code>.
            </p>
          </div>
        ) : (
          <>
            <h2 className="demo-section-title mb-4">Todos</h2>

            <ul className="space-y-3 mb-6">
              {todos.map((todo) => (
                <li key={todo.id} className="demo-list-item">
                  <span className="font-medium">{todo.title}</span>
                </li>
              ))}
              {todos.length === 0 && (
                <li className="demo-list-item text-center demo-muted">
                  No todos yet. Create one below!
                </li>
              )}
            </ul>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input
                type="text"
                name="title"
                placeholder="Add a new todo..."
                className="demo-input min-w-0 flex-1"
              />
              <button type="submit" className="demo-button whitespace-nowrap">
                Add Todo
              </button>
            </form>
          </>
        )}

        <div className="demo-card mt-8">
          <h3 className="demo-section-title mb-2">Powered by Neon</h3>
          <p className="demo-muted text-sm">
            This demo reads the same todos as the Drizzle demo — both go through
            the gateway server connected to Neon PostgreSQL.
          </p>
        </div>
      </section>
    </main>
  )
}
