import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { store } from './store';

export const apiKey = pgTable(
  'api_key',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    keyHash: text('key_hash').notNull().unique(),
    keyPrefix: text('key_prefix').notNull(),
    storeId: text('store_id')
      .notNull()
      .references(() => store.id, { onDelete: 'cascade' }),
    lastUsedAt: timestamp('last_used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('api_key_store_id_idx').on(table.storeId),
    index('api_key_key_hash_idx').on(table.keyHash),
  ],
)

export type ApiKey = typeof apiKey.$inferSelect
export type NewApiKey = typeof apiKey.$inferInsert
