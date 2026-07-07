import { index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

import { store } from './store'

export const idempotencyKey = pgTable(
  'idempotency_key',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => store.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status').notNull(),
    responseBody: jsonb('response_body').notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('idempotency_key_store_key_unique').on(table.storeId, table.key),
    index('idempotency_key_store_id_idx').on(table.storeId),
  ],
)

export type IdempotencyKeyRecord = typeof idempotencyKey.$inferSelect
export type NewIdempotencyKeyRecord = typeof idempotencyKey.$inferInsert
