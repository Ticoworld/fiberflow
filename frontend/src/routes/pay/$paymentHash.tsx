import { createFileRoute, notFound } from '@tanstack/react-router'
import { format } from 'date-fns'
import { CheckCircle2, Copy, Loader2 } from 'lucide-react'
import QRCode from 'react-qr-code'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

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
  fetchPublicInvoice,
  formatPublicAmountInUsd,
  formatPublicCurrency,
  formatPublicFiberAmount,
  isAwaitingPayment,
  type PublicInvoice,
  type PublicInvoiceStatus,
} from '#/lib/public-invoice-api.ts'

const POLL_INTERVAL_MS = 5_000
const PAID_REDIRECT_DELAY_MS = 2_000

export const Route = createFileRoute('/pay/$paymentHash')({
  loader: async ({ params }) => {
    const paymentHash = decodeURIComponent(params.paymentHash)

    try {
      const invoice = await fetchPublicInvoice(paymentHash)
      return { invoice, paymentHash }
    } catch {
      throw notFound()
    }
  },
  head: () => ({
    meta: [{ title: 'Pay with Fiber | FiberFlow' }],
  }),
  component: PayInvoicePage,
})

function statusLabel(status: PublicInvoiceStatus): string {
  switch (status) {
    case 'open':
      return 'Awaiting payment'
    case 'received':
      return 'Payment detected'
    case 'paid':
      return 'Paid'
    case 'expired':
      return 'Expired'
    case 'cancelled':
      return 'Cancelled'
    default: {
      const exhaustiveCheck: never = status
      return exhaustiveCheck
    }
  }
}

function statusVariant(status: PublicInvoiceStatus) {
  switch (status) {
    case 'paid':
      return 'default' as const
    case 'open':
      return 'secondary' as const
    case 'received':
      return 'outline' as const
    case 'expired':
    case 'cancelled':
      return 'destructive' as const
    default: {
      const exhaustiveCheck: never = status
      return exhaustiveCheck
    }
  }
}

function PayInvoicePage() {
  const { invoice: initialInvoice, paymentHash } = Route.useLoaderData()
  const [invoice, setInvoice] = useState(initialInvoice)

  useEffect(() => {
    if (!isAwaitingPayment(invoice.status)) {
      return
    }

    const intervalId = window.setInterval(() => {
      void fetchPublicInvoice(paymentHash)
        .then(setInvoice)
        .catch(() => {
          // Keep showing the last known invoice state while polling.
        })
    }, POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [invoice.status, paymentHash])

  useEffect(() => {
    if (invoice.status !== 'paid' || !invoice.success_url) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      window.location.assign(invoice.success_url!)
    }, PAID_REDIRECT_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [invoice.status, invoice.success_url])

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address)
      toast.success('Payment address copied')
    } catch {
      toast.error('Unable to copy payment address')
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Pay with Fiber</CardTitle>
          <CardDescription>
            Send the exact amount to the address below using your Fiber wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PaymentSummary invoice={invoice} />
          <PaymentAddressSection invoice={invoice} onCopyAddress={copyAddress} />
          <PaymentStatusSection invoice={invoice} />
        </CardContent>
      </Card>
    </div>
  )
}

function PaymentSummary({ invoice }: { invoice: PublicInvoice }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4 text-center">
      <p className="text-sm text-muted-foreground">Amount due</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">
        ${formatPublicAmountInUsd(invoice.amount_in_usd)}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatPublicFiberAmount(invoice.amount)} · {formatPublicCurrency(invoice.currency)}
      </p>
      {invoice.description ? (
        <p className="mt-3 text-sm text-muted-foreground">{invoice.description}</p>
      ) : null}
    </div>
  )
}

function PaymentAddressSection({
  invoice,
  onCopyAddress,
}: {
  invoice: PublicInvoice
  onCopyAddress: (address: string) => void
}) {
  if (!invoice.invoice_address || invoice.status === 'paid') {
    return null
  }

  if (invoice.status === 'expired' || invoice.status === 'cancelled') {
    return (
      <p className="text-center text-sm text-muted-foreground">
        This invoice is no longer accepting payments.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="mx-auto flex w-fit rounded-lg border bg-white p-4">
        <QRCode value={invoice.invoice_address} size={176} />
      </div>
      <div className="space-y-2">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Payment address
        </p>
        <div className="flex items-start gap-2 rounded-lg border p-3">
          <code className="min-w-0 flex-1 break-all text-xs">{invoice.invoice_address}</code>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            aria-label="Copy payment address"
            onClick={() => onCopyAddress(invoice.invoice_address!)}
          >
            <Copy className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function PaymentStatusSection({ invoice }: { invoice: PublicInvoice }) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Status</span>
        <Badge variant={statusVariant(invoice.status)}>{statusLabel(invoice.status)}</Badge>
      </div>

      {invoice.status === 'received' ? (
        <p className="text-sm text-muted-foreground">
          Payment detected. Waiting for Fiber network confirmation.
        </p>
      ) : null}

      {invoice.status === 'paid' ? (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Payment complete.
            {invoice.success_url
              ? ' Redirecting you back to the merchant...'
              : ' You can close this page.'}
          </p>
        </div>
      ) : null}

      {isAwaitingPayment(invoice.status) ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Watching for payment...
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Expires {format(new Date(invoice.expires_at), 'MMM d, yyyy HH:mm')}
      </p>
    </div>
  )
}
