import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router'
import { format } from 'date-fns'
import { Plus, Webhook } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { DashboardHeader } from '#/components/dashboard/dashboard-header.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog.tsx'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty.tsx'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Spinner } from '#/components/ui/spinner.tsx'
import { Switch } from '#/components/ui/switch.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { createStoreWebhook, fetchStoreWebhooks } from '#/lib/webhooks-api.ts'
import { fetchStoreBySlug } from '#/lib/stores-api.ts'

const createWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  url: z.string().url('Enter a valid webhook URL'),
  enabled: z.boolean(),
})

type CreateWebhookFormValues = z.infer<typeof createWebhookSchema>

const storeRouteApi = getRouteApi('/dashboard/$storeSlug')

export const Route = createFileRoute('/dashboard/$storeSlug/webhook/')({
  loader: async ({ params }) => {
    const store = await fetchStoreBySlug(params.storeSlug)
    const webhooks = await fetchStoreWebhooks(store.id)
    return { webhooks }
  },
  component: WebhooksPage,
})

function WebhooksPage() {
  const { store } = storeRouteApi.useLoaderData()
  const { webhooks: initialWebhooks } = Route.useLoaderData()
  const [webhooks, setWebhooks] = useState(initialWebhooks)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const form = useForm<CreateWebhookFormValues>({
    resolver: zodResolver(createWebhookSchema),
    defaultValues: {
      name: '',
      url: '',
      enabled: true,
    },
  })

  async function onCreateSubmit(values: CreateWebhookFormValues) {
    setIsCreating(true)

    try {
      const created = await createStoreWebhook(store.id, {
        name: values.name.trim(),
        url: values.url.trim(),
        enabled: values.enabled,
      })

      setWebhooks((current) => [created, ...current])
      form.reset()
      setDialogOpen(false)
      toast.success('Webhook created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create webhook')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <DashboardHeader
        title="Webhooks"
        description="Manage endpoints that receive signed invoice events."
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Add webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add webhook</DialogTitle>
                <DialogDescription>
                  FiberFlow will POST signed events like <code>invoice.paid</code> to this URL.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onCreateSubmit)}>
                <FieldGroup>
                  <Field data-invalid={!!form.formState.errors.name}>
                    <FieldLabel htmlFor="webhook-name">Name</FieldLabel>
                    <Input
                      id="webhook-name"
                      placeholder="Production server"
                      aria-invalid={!!form.formState.errors.name}
                      {...form.register('name')}
                    />
                    <FieldError errors={[form.formState.errors.name]} />
                  </Field>
                  <Field data-invalid={!!form.formState.errors.url}>
                    <FieldLabel htmlFor="webhook-url">Endpoint URL</FieldLabel>
                    <Input
                      id="webhook-url"
                      placeholder="https://example.com/webhooks/fiberflow"
                      aria-invalid={!!form.formState.errors.url}
                      {...form.register('url')}
                    />
                    <FieldError errors={[form.formState.errors.url]} />
                  </Field>
                  <Field>
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                      <FieldLabel htmlFor="webhook-enabled">Enabled</FieldLabel>
                      <Switch
                        id="webhook-enabled"
                        checked={form.watch('enabled')}
                        onCheckedChange={(checked) => form.setValue('enabled', checked)}
                      />
                    </div>
                  </Field>
                </FieldGroup>
                <DialogFooter className="mt-4">
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? <Spinner className="size-4" /> : null}
                    Create webhook
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {webhooks.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Webhook />
              </EmptyMedia>
              <EmptyTitle>No webhooks yet</EmptyTitle>
              <EmptyDescription>
                Add a webhook endpoint to receive invoice status updates on your server.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="size-4" />
                Add webhook
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell>
                    <Link
                      to="/dashboard/$storeSlug/webhook/$webhookId"
                      params={{ storeSlug: store.slug, webhookId: webhook.id }}
                      className="font-medium hover:underline"
                    >
                      {webhook.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{webhook.url}</TableCell>
                  <TableCell>
                    <Badge variant={webhook.enabled ? 'default' : 'secondary'}>
                      {webhook.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(webhook.createdAt), 'MMM d, yyyy')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  )
}
