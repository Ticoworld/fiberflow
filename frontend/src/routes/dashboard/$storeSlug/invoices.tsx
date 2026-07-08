import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { format } from 'date-fns'
import { Copy, ExternalLink, FileText, Plus } from 'lucide-react'
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
  FieldDescription,
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
import type { Invoice, InvoiceStatus } from '#/lib/invoices-api.ts'
import {
  createInvoice,
  fetchInvoices,
  formatAmountInUsd,
  buildPaymentUrl,
} from '#/lib/invoices-api.ts'
import { fetchStoreBySlug } from '#/lib/stores-api.ts'

const createInvoiceSchema = z.object({
  amountInUSD: z
    .string()
    .min(1, 'Amount is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  customerEmail: z.email('Enter a valid email address'),
  description: z.string().optional(),
})

type CreateInvoiceFormInput = {
  amountInUSD: string
  orderId: string
  customerEmail: string
  description?: string
}
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

  const form = useForm<CreateInvoiceFormInput, unknown, CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      amountInUSD: '',
      orderId: '',
      customerEmail: '',
      description: '',
    },
  })

  async function onSubmit(values: CreateInvoiceFormValues) {
    setIsSubmitting(true)


    try {
      const invoice = await createInvoice(store.id, {
        amountInUSD: Number(values.amountInUSD),
        orderId: values.orderId.trim(),
        customerEmail: values.customerEmail.trim(),
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
        description={`Manage payment invoices`}
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
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create invoice</DialogTitle>
                <DialogDescription>
                  Generate a new payment invoice for this store.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                  <Field data-invalid={!!form.formState.errors.amountInUSD}>
                    <FieldLabel htmlFor="amountInUSD">Amount (USD)</FieldLabel>
                    <Input
                      id="amountInUSD"
                      type="number"
                      inputMode="decimal"
                      placeholder="10.00"
                      aria-invalid={!!form.formState.errors.amountInUSD}
                      {...form.register('amountInUSD')}
                    />
                    <FieldError errors={[form.formState.errors.amountInUSD]} />
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

                  <Field data-invalid={!!form.formState.errors.orderId}>
                    <FieldLabel htmlFor="orderId">Order ID</FieldLabel>
                    <Input
                      id="orderId"
                      placeholder="order_12345"
                      aria-invalid={!!form.formState.errors.orderId}
                      {...form.register('orderId')}
                    />
                    <FieldDescription>Your unique reference for this order.</FieldDescription>
                    <FieldError errors={[form.formState.errors.orderId]} />
                  </Field>

                  <Field data-invalid={!!form.formState.errors.customerEmail}>
                    <FieldLabel htmlFor="customerEmail">Customer email</FieldLabel>
                    <Input
                      id="customerEmail"
                      type="email"
                      placeholder="customer@example.com"
                      aria-invalid={!!form.formState.errors.customerEmail}
                      {...form.register('customerEmail')}
                    />
                    <FieldError errors={[form.formState.errors.customerEmail]} />
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
  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(successMessage)
    } catch {
      toast.error('Unable to copy to clipboard')
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Amount (USD)</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment link</TableHead>
          <TableHead>Payment Address</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">{invoice.orderId}</TableCell>
            <TableCell className="max-w-[200px] truncate text-muted-foreground">
              {invoice.customerEmail}
            </TableCell>
            <TableCell>
              ${formatAmountInUsd(invoice.amountInUSD)} 
              
            </TableCell>
            <TableCell>
              <Badge variant={invoiceStatusVariant(invoice.status)}>{invoice.status}</Badge>
            </TableCell>
            <TableCell>
              {invoice.paymentHash ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    aria-label="Copy payment link"
                    onClick={() => void copyText(buildPaymentUrl(invoice.paymentHash!), 'Payment link copied')}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    aria-label="Open payment page"
                    asChild
                  >
                    <a
                      href={buildPaymentUrl(invoice.paymentHash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </div>
              ) : (
                '—'
              )}
            </TableCell>
            <TableCell className="max-w-[280px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="min-w-0 truncate" title={invoice.invoiceAddress ?? undefined}>
                  {invoice.invoiceAddress ?? '—'}
                </span>
                {invoice.invoiceAddress ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    aria-label="Copy payment address"
                    onClick={() => {
                      if (!invoice.invoiceAddress) return
                      void copyText(invoice.invoiceAddress, 'Payment address copied')
                    }}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                ) : null}
              </div>
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
