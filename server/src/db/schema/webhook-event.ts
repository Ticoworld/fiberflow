import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { invoice } from './invoice'
import { store } from './store'

export const WEBHOOK_EVENT_TYPES = [
  'invoice.created',
  'invoice.received',
  'invoice.paid',
  'invoice.expired',
  'invoice.cancelled',
] as const

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number]

export type WebhookEventPayload = {
  id: string
  type: WebhookEventType
  created_at: string
  data: {
    invoice_id: number
    order_id: string
    payment_hash: string | null
    amount_in_usd: number
    status: string
    customer_email: string
    metadata: Record<string, string>
    success_url: string | null
    cancel_url: string | null
  }
}

export const webhookEvent = pgTable(
  'webhook_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => store.id, { onDelete: 'cascade' }),
    invoiceId: integer('invoice_id')
      .notNull()
      .references(() => invoice.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull().$type<WebhookEventType>(),
    payload: jsonb('payload').notNull().$type<WebhookEventPayload>(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('webhook_event_store_id_idx').on(table.storeId),
    index('webhook_event_invoice_id_idx').on(table.invoiceId),
  ],
)

export type WebhookEvent = typeof webhookEvent.$inferSelect
export type NewWebhookEvent = typeof webhookEvent.$inferInsert
