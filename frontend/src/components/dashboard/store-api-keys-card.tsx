import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Copy, Key, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

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
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '#/components/ui/input-group.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Spinner } from '#/components/ui/spinner.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import type { ApiKeySummary } from '#/lib/api-keys-api.ts'
import { createApiKey, deleteApiKey } from '#/lib/api-keys-api.ts'

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
})

type CreateApiKeyFormValues = z.infer<typeof createApiKeySchema>

type StoreApiKeysCardProps = {
  storeId: string
  apiKeys: ApiKeySummary[]
}

export function StoreApiKeysCard({ storeId, apiKeys: initialApiKeys }: StoreApiKeysCardProps) {
  const [apiKeys, setApiKeys] = useState(initialApiKeys)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<CreateApiKeyFormValues>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { name: '' },
  })

  const deletingKey = apiKeys.find((key) => key.id === deletingKeyId)

  async function onCreateSubmit(values: CreateApiKeyFormValues) {
    setIsCreating(true)

    try {
      const created = await createApiKey(storeId, values.name.trim())
      const { token, ...summary } = created

      setApiKeys((current) => [summary, ...current])
      form.reset()
      setCreateDialogOpen(false)
      setCreatedToken(token)
      setTokenDialogOpen(true)
      toast.success('API key created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create API key')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDeleteKey() {
    if (!deletingKeyId) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteApiKey(storeId, deletingKeyId)
      setApiKeys((current) => current.filter((key) => key.id !== deletingKeyId))
      setDeletingKeyId(null)
      toast.success('API key revoked')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to revoke API key')
    } finally {
      setIsDeleting(false)
    }
  }

  async function copyToken() {
    if (!createdToken) {
      return
    }

    try {
      await navigator.clipboard.writeText(createdToken)
      toast.success('API key copied to clipboard')
    } catch {
      toast.error('Unable to copy API key')
    }
  }

  function handleTokenDialogChange(open: boolean) {
    setTokenDialogOpen(open)

    if (!open) {
      setCreatedToken(null)
    }
  }

  return (
    <>
      <Card className="max-w-2xl mx-auto w-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>API keys</CardTitle>
              <CardDescription>
                Create and manage keys for integrating with the Fiberflow API.
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus />
                  New key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API key</DialogTitle>
                  <DialogDescription>
                    Give your key a name so you can identify it later.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onCreateSubmit)}>
                  <FieldGroup>
                    <Field data-invalid={!!form.formState.errors.name}>
                      <FieldLabel htmlFor="api-key-name">Name</FieldLabel>
                      <Input
                        id="api-key-name"
                        placeholder="Production server"
                        aria-invalid={!!form.formState.errors.name}
                        {...form.register('name')}
                      />
                      <FieldError errors={[form.formState.errors.name]} />
                    </Field>
                  </FieldGroup>
                  <DialogFooter className="mt-4">
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <Spinner />
                          Creating...
                        </>
                      ) : (
                        'Create key'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Key />
                </EmptyMedia>
                <EmptyTitle>No API keys yet</EmptyTitle>
                <EmptyDescription>
                  Create an API key to authenticate requests from your application.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="rounded-lg border">
              <ApiKeysTable apiKeys={apiKeys} onDelete={setDeletingKeyId} />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={tokenDialogOpen} onOpenChange={handleTokenDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your API key</DialogTitle>
            <DialogDescription>
              Copy this key now. You will not be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTitle>Keep this key secret</AlertTitle>
            <AlertDescription>
              Store it securely and never share it in client-side code or public repositories.
            </AlertDescription>
          </Alert>
          <InputGroup>
            <InputGroupInput readOnly value={createdToken ?? ''} />
            <InputGroupAddon align="inline-end">
              <InputGroupButton aria-label="Copy API key" onClick={() => void copyToken()}>
                <Copy />
                Copy
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <DialogFooter>
            <Button onClick={() => handleTokenDialogChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingKeyId !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeletingKeyId(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingKey
                ? `"${deletingKey.name}" will stop working immediately. This action cannot be undone.`
                : 'This key will stop working immediately. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteKey()
              }}
            >
              {isDeleting ? (
                <>
                  <Spinner />
                  Revoking...
                </>
              ) : (
                'Revoke key'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ApiKeysTable({
  apiKeys,
  onDelete,
}: {
  apiKeys: ApiKeySummary[]
  onDelete: (id: string) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Last used</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {apiKeys.map((apiKey) => (
          <TableRow key={apiKey.id}>
            <TableCell className="font-medium">{apiKey.name}</TableCell>
            <TableCell className="font-mono text-sm text-muted-foreground">
              {apiKey.keyPrefix}...
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(apiKey.createdAt), 'MMM d, yyyy')}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {apiKey.lastUsedAt
                ? format(new Date(apiKey.lastUsedAt), 'MMM d, yyyy HH:mm')
                : 'Never'}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Revoke ${apiKey.name}`}
                onClick={() => onDelete(apiKey.id)}
              >
                <Trash2 />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
