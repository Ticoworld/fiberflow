import { index, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

import { storeWebhook } from './store-webhook'
import { webhookEvent } from './webhook-event'

export const webhookDeliveryStatusEnum = pgEnum('webhook_delivery_status', [
  'pending',
  'succeeded',
  'failed',
])

export const webhookDelivery = pgTable(
  'webhook_delivery',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => webhookEvent.id, { onDelete: 'cascade' }),
    webhookId: uuid('webhook_id')
      .notNull()
      .references(() => storeWebhook.id, { onDelete: 'cascade' }),
    attempt: integer('attempt').notNull().default(1),
    status: webhookDeliveryStatusEnum('status').notNull().default('pending'),
    httpStatus: integer('http_status'),
    responseBody: text('response_body'),
    nextRetryAt: timestamp('next_retry_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('webhook_delivery_event_id_idx').on(table.eventId),
    index('webhook_delivery_webhook_id_idx').on(table.webhookId),
    index('webhook_delivery_status_next_retry_idx').on(table.status, table.nextRetryAt),
    unique('webhook_delivery_event_webhook_unique').on(table.eventId, table.webhookId),
  ],
)

export type WebhookDelivery = typeof webhookDelivery.$inferSelect
export type NewWebhookDelivery = typeof webhookDelivery.$inferInsert
export type WebhookDeliveryStatus = (typeof webhookDeliveryStatusEnum.enumValues)[number]
