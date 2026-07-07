import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { store } from './store'

export const storeWebhook = pgTable(
  'store_webhook',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => store.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    url: text('url').notNull(),
    secret: text('secret').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('store_webhook_store_id_idx').on(table.storeId)],
)

export type StoreWebhook = typeof storeWebhook.$inferSelect
export type NewStoreWebhook = typeof storeWebhook.$inferInsert
