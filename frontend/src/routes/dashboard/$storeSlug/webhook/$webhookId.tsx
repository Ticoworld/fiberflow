import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ArrowLeft, Copy, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { DashboardHeader } from '#/components/dashboard/dashboard-header.tsx'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field.tsx'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '#/components/ui/input-group.tsx'
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
import { fetchStoreBySlug } from '#/lib/stores-api.ts'
import {
  MERCHANT_INTEGRATION_DOC_PATH,
  WEBHOOK_VERIFY_NODE_SNIPPET,
} from '#/lib/integration.ts'
import {
  deleteStoreWebhook,
  fetchStoreWebhook,
  fetchWebhookLogs,
  rotateStoreWebhookSecret,
  updateStoreWebhook,
} from '#/lib/webhooks-api.ts'

const updateWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  url: z.string().url('Enter a valid webhook URL'),
  enabled: z.boolean(),
})

type UpdateWebhookFormValues = z.infer<typeof updateWebhookSchema>

const storeRouteApi = getRouteApi('/dashboard/$storeSlug')

export const Route = createFileRoute('/dashboard/$storeSlug/webhook/$webhookId')({
  loader: async ({ params }) => {
    const store = await fetchStoreBySlug(params.storeSlug)
    const [webhook, logs] = await Promise.all([
      fetchStoreWebhook(store.id, params.webhookId),
      fetchWebhookLogs(store.id, params.webhookId),
    ])
    return { webhook, logs }
  },
  component: WebhookDetailPage,
})

function deliveryStatusVariant(status: 'pending' | 'succeeded' | 'failed') {
  switch (status) {
    case 'succeeded':
      return 'default' as const
    case 'pending':
      return 'secondary' as const
    case 'failed':
      return 'destructive' as const
    default: {
      const exhaustiveCheck: never = status
      return exhaustiveCheck
    }
  }
}

function WebhookDetailPage() {
  const { store } = storeRouteApi.useLoaderData()
  const { webhook: initialWebhook, logs: initialLogs } = Route.useLoaderData()
  const navigate = useNavigate()
  const [webhook, setWebhook] = useState(initialWebhook)
  const [logs] = useState(initialLogs)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<UpdateWebhookFormValues>({
    resolver: zodResolver(updateWebhookSchema),
    defaultValues: {
      name: initialWebhook.name,
      url: initialWebhook.url,
      enabled: initialWebhook.enabled,
    },
  })

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(webhook.secret)
      toast.success('Webhook secret copied')
    } catch {
      toast.error('Unable to copy webhook secret')
    }
  }

  async function copyVerificationSnippet() {
    try {
      await navigator.clipboard.writeText(WEBHOOK_VERIFY_NODE_SNIPPET)
      toast.success('Verification snippet copied')
    } catch {
      toast.error('Unable to copy verification snippet')
    }
  }

  async function onSubmit(values: UpdateWebhookFormValues) {
    setIsSaving(true)

    try {
      const updated = await updateStoreWebhook(store.id, webhook.id, {
        name: values.name.trim(),
        url: values.url.trim(),
        enabled: values.enabled,
      })

      setWebhook(updated)
      toast.success('Webhook updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update webhook')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRotateSecret() {
    setIsRotating(true)

    try {
      const updated = await rotateStoreWebhookSecret(store.id, webhook.id)
      setWebhook(updated)
      toast.success('Webhook secret rotated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to rotate webhook secret')
    } finally {
      setIsRotating(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)

    try {
      await deleteStoreWebhook(store.id, webhook.id)
      toast.success('Webhook removed')
      await navigate({ to: '/dashboard/$storeSlug/webhook', params: { storeSlug: store.slug } })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove webhook')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <DashboardHeader
        title={webhook.name}
        description="Webhook endpoint details and delivery logs."
      />

      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div>
          <Button variant="outline" asChild>
            <Link to="/dashboard/$storeSlug/webhook" params={{ storeSlug: store.slug }}>
              <ArrowLeft className="size-4" />
              Back to webhooks
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Update the endpoint URL and delivery settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Field data-invalid={!!form.formState.errors.name}>
                  <FieldLabel htmlFor="webhook-name">Name</FieldLabel>
                  <Input id="webhook-name" {...form.register('name')} />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>

                <Field data-invalid={!!form.formState.errors.url}>
                  <FieldLabel htmlFor="webhook-url">Endpoint URL</FieldLabel>
                  <Input id="webhook-url" {...form.register('url')} />
                  <FieldError errors={[form.formState.errors.url]} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="webhook-secret">Signing secret</FieldLabel>
                  <InputGroup>
                    <InputGroupInput id="webhook-secret" readOnly value={webhook.secret} />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-sm"
                        aria-label="Copy webhook secret"
                        onClick={() => void copySecret()}
                      >
                        <Copy className="size-4" />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>
                    Verify <code className="text-xs">X-FiberFlow-Signature</code> with this secret.
                    Fulfill orders on <code className="text-xs">invoice.paid</code> only.
                  </FieldDescription>
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

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Spinner className="size-4" /> : null}
                    Save changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isRotating}
                    onClick={() => void handleRotateSecret()}
                  >
                    {isRotating ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
                    Rotate secret
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verify webhooks</CardTitle>
            <CardDescription>
              Read the raw body, verify the signature, then handle{' '}
              <code className="text-xs">invoice.paid</code>. See{' '}
              <code className="text-xs">{MERCHANT_INTEGRATION_DOC_PATH}</code> and{' '}
              <code className="text-xs">examples/node-webhook/</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 text-xs">
              <code>{WEBHOOK_VERIFY_NODE_SNIPPET}</code>
            </pre>
            <Button type="button" variant="outline" onClick={() => void copyVerificationSnippet()}>
              <Copy className="size-4" />
              Copy Node.js snippet
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery logs</CardTitle>
            <CardDescription>Recent webhook delivery attempts for this endpoint.</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliveries yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>HTTP</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <code className="text-xs">{log.eventType}</code>
                      </TableCell>
                      <TableCell>{log.payload.data.order_id}</TableCell>
                      <TableCell>
                        <Badge variant={deliveryStatusVariant(log.status)}>{log.status}</Badge>
                      </TableCell>
                      <TableCell>{log.httpStatus ?? '—'}</TableCell>
                      <TableCell>{log.attempt}</TableCell>
                      <TableCell>{format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This endpoint will stop receiving invoice events.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={() => void handleDelete()}>
              {isDeleting ? <Spinner className="size-4" /> : null}
              Remove webhook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
