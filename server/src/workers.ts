import { pollPendingInvoices, processDueWebhookDeliveries } from './lib/invoice-sync'

const INVOICE_POLL_INTERVAL_MS = Number(process.env.INVOICE_POLL_INTERVAL_MS ?? 15_000)
const WEBHOOK_RETRY_INTERVAL_MS = Number(process.env.WEBHOOK_RETRY_INTERVAL_MS ?? 30_000)

let workersStarted = false

async function runInvoicePoller() {
  try {
    await pollPendingInvoices()
  } catch (error) {
    console.error('Invoice poller failed:', error)
  }
}

async function runWebhookRetryWorker() {
  try {
    await processDueWebhookDeliveries()
  } catch (error) {
    console.error('Webhook retry worker failed:', error)
  }
}

export function startBackgroundWorkers() {
  if (workersStarted) {
    return
  }

  workersStarted = true

  void runInvoicePoller()
  void runWebhookRetryWorker()

  setInterval(() => {
    void runInvoicePoller()
  }, INVOICE_POLL_INTERVAL_MS)

  setInterval(() => {
    void runWebhookRetryWorker()
  }, WEBHOOK_RETRY_INTERVAL_MS)
}
