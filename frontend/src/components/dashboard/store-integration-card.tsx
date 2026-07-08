import { BookOpen, Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '#/components/ui/input-group.tsx'
import {
  MERCHANT_INTEGRATION_DOC_PATH,
  buildCreateInvoiceCurl,
  getMerchantApiBaseUrl,
} from '#/lib/integration.ts'

type StoreIntegrationCardProps = {
  apiKeyPreview?: string | null
}

export function StoreIntegrationCard({ apiKeyPreview }: StoreIntegrationCardProps) {
  const merchantApiBaseUrl = getMerchantApiBaseUrl()

  async function copyText(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(message)
    } catch {
      toast.error('Unable to copy to clipboard')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="size-5" />
          Integration
        </CardTitle>
        <CardDescription>
          Connect your store backend to FiberFlow. Fulfill orders on{' '}
          <code className="text-xs">invoice.paid</code> webhooks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Merchant API base URL</p>
          <InputGroup>
            <InputGroupInput readOnly value={merchantApiBaseUrl} />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                size="icon-sm"
                aria-label="Copy API base URL"
                onClick={() => void copyText(merchantApiBaseUrl, 'API base URL copied')}
              >
                <Copy className="size-4" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>

        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Create an API key below.</li>
          <li>Add a webhook URL under Webhooks.</li>
          <li>
            <code className="text-xs">POST /v1/invoices</code> from your store backend.
          </li>
          <li>Redirect customers to <code className="text-xs">payment_url</code>.</li>
          <li>Fulfill when you receive <code className="text-xs">invoice.paid</code>.</li>
        </ol>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Example: create invoice</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void copyText(
                  buildCreateInvoiceCurl(apiKeyPreview ?? 'ffg_YOUR_API_KEY'),
                  'curl example copied',
                )
              }
            >
              <Copy className="size-4" />
              Copy curl
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs">
            <code>{buildCreateInvoiceCurl(apiKeyPreview ?? 'ffg_YOUR_API_KEY')}</code>
          </pre>
        </div>

        <p className="text-sm text-muted-foreground">
          Full guide: <code className="text-xs">{MERCHANT_INTEGRATION_DOC_PATH}</code>
          {' · '}
          Example receiver:{' '}
          <code className="text-xs">examples/node-webhook/</code> in the FiberFlow repo.
        </p>
      </CardContent>
    </Card>
  )
}
