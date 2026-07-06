import { createFileRoute, useRouter } from '@tanstack/react-router'

import { apiFetch } from '#/lib/api'

type Todo = {
  id: number
  title: string
  createdAt: string | null
}

async function getTodos(): Promise<Todo[]> {
  const response = await apiFetch('/api/todos')
  if (!response.ok) {
    throw new Error('Failed to load todos')
  }
  return response.json()
}

export const Route = createFileRoute('/demo/drizzle')({
  component: DemoDrizzle,
  loader: async () => await getTodos(),
})

function DemoDrizzle() {
  const router = useRouter()
  const todos = Route.useLoaderData()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const title = formData.get('title') as string

    if (!title) return

    try {
      const response = await apiFetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })

      if (!response.ok) {
        throw new Error('Failed to create todo')
      }

      router.invalidate()
      ;(e.target as HTMLFormElement).reset()
    } catch (error) {
      console.error('Failed to create todo:', error)
    }
  }

  return (
    <main className="demo-page demo-center">
      <section className="demo-panel w-full max-w-2xl">
        <header className="mb-8 flex items-center gap-4">
          <span className="demo-card flex h-14 w-14 items-center justify-center p-3">
            <img src="/drizzle.svg" alt="Drizzle Logo" className="h-8 w-8" />
          </span>
          <div>
            <p className="island-kicker mb-2">Database</p>
            <h1 className="demo-title">Drizzle Demo</h1>
          </div>
        </header>

        <h2 className="demo-section-title mb-4">Todos</h2>

        <ul className="space-y-3 mb-6">
          {todos.map((todo) => (
            <li key={todo.id} className="demo-list-item">
              <div className="flex items-center justify-between">
                <span className="font-medium">{todo.title}</span>
                <span className="demo-muted text-xs">#{todo.id}</span>
              </div>
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

        <div className="demo-card mt-8">
          <h3 className="demo-section-title mb-2">Powered by Drizzle ORM</h3>
          <p className="demo-muted mb-4 text-sm">
            Todos are stored in Neon via the gateway server (Drizzle + PostgreSQL).
          </p>
          <div className="space-y-2 text-sm">
            <p className="font-medium">Server setup:</p>
            <ol className="demo-muted list-inside list-decimal space-y-2">
              <li>
                Set <code>DATABASE_URL</code> in <code>server/.env</code>
              </li>
              <li>
                Run: <code>bun run db:push</code> in <code>server/</code>
              </li>
              <li>
                Start the gateway: <code>./start.sh</code>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </main>
  )
}
