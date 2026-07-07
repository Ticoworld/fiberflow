import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { format } from 'date-fns'
import { FileText, Plus } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import {
  type Invoice,
  type InvoiceStatus,
  createInvoice,
  fetchInvoices,
} from '#/lib/invoices-api.ts'
import { fetchStoreBySlug } from '#/lib/stores-api.ts'

const createInvoiceSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  currency: z.string().min(1, 'Currency is required'),
  description: z.string().optional(),
})

type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema>

const storeRouteApi = getRouteApi('/dashboard/$storeSlug')

export const Route = createFileRoute('/dashboard/$storeSlug/invoices')({
  loader: async ({ params }) => {
    const store = await fetchStoreBySlug(params.storeSlug)
    const invoices = await fetchInvoices(store.id)
    return { invoices }
  },
  component: InvoicesPage,
})

function invoiceStatusVariant(status: InvoiceStatus) {
  switch (status) {
    case 'Paid':
      return 'default' as const
    case 'Open':
      return 'secondary' as const
    case 'Received':
      return 'outline' as const
    case 'Expired':
    case 'Cancelled':
      return 'destructive' as const
    default: {
      const exhaustiveCheck: never = status
      return exhaustiveCheck
    }
  }
}

function InvoicesPage() {
  const { store } = storeRouteApi.useLoaderData()
  const initialInvoices = Route.useLoaderData().invoices
  const [invoices, setInvoices] = useState(initialInvoices)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      amount: '',
      currency: 'CKB',
      description: '',
    },
  })

  async function onSubmit(values: CreateInvoiceFormValues) {
    setIsSubmitting(true)

    try {
      const invoice = await createInvoice(store.id, {
        amount: values.amount,
        currency: values.currency,
        description: values.description?.trim() || undefined,
      })

      setInvoices((current) => [invoice, ...current])
      form.reset()
      setDialogOpen(false)
      toast.success('Invoice created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create invoice')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <DashboardHeader
        title="Invoices"
        description={`Manage payment invoices for ${store.name}`}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus />
                New invoice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create invoice</DialogTitle>
                <DialogDescription>
                  Generate a new payment invoice for this store.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Field data-invalid={!!form.formState.errors.amount}>
                    <FieldLabel htmlFor="amount">Amount</FieldLabel>
                    <Input
                      id="amount"
                      placeholder="100000000"
                      aria-invalid={!!form.formState.errors.amount}
                      {...form.register('amount')}
                    />
                    <FieldError errors={[form.formState.errors.amount]} />
                  </Field>

                  <Field data-invalid={!!form.formState.errors.currency}>
                    <FieldLabel htmlFor="currency">Currency</FieldLabel>
                    <Input
                      id="currency"
                      placeholder="CKB"
                      aria-invalid={!!form.formState.errors.currency}
                      {...form.register('currency')}
                    />
                    <FieldError errors={[form.formState.errors.currency]} />
                  </Field>

                  <Field data-invalid={!!form.formState.errors.description}>
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Input
                      id="description"
                      placeholder="Optional payment description"
                      aria-invalid={!!form.formState.errors.description}
                      {...form.register('description')}
                    />
                    <FieldError errors={[form.formState.errors.description]} />
                  </Field>
                </FieldGroup>

                <DialogFooter className="mt-4">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Spinner />
                        Creating...
                      </>
                    ) : (
                      'Create invoice'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {invoices.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText />
              </EmptyMedia>
              <EmptyTitle>No invoices yet</EmptyTitle>
              <EmptyDescription>
                Create your first invoice to start accepting payments.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus />
                New invoice
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="rounded-lg border">
            <InvoicesTable invoices={invoices} />
          </div>
        )}
      </div>
    </>
  )
}

function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">#{invoice.id}</TableCell>
            <TableCell>
              {invoice.amount} {invoice.currency}
            </TableCell>
            <TableCell>
              <Badge variant={invoiceStatusVariant(invoice.status)}>{invoice.status}</Badge>
            </TableCell>
            <TableCell className="max-w-[240px] truncate text-muted-foreground">
              {invoice.description ?? '—'}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(invoice.createdAt), 'MMM d, yyyy HH:mm')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
