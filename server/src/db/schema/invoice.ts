import {
  bigint,
  index,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

import { user } from './auth'

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'Open',
  'Received',
  'Paid',
  'Expired',
  'Cancelled',
])

export const invoice = pgTable(
  'invoice',
  {
    id: serial('id').primaryKey(),
    paymentHash: text('payment_hash').notNull().unique(),
    invoiceAddress: text('invoice_address').notNull(),
    amount: text('amount').notNull(),
    currency: text('currency').notNull(),
    description: text('description'),
    expirySeconds: bigint('expiry_seconds', { mode: 'number' }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    status: invoiceStatusEnum('status').notNull().default('Open'),
    udtTypeScript: text('udt_type_script'),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('invoice_status_idx').on(table.status),
    index('invoice_user_id_idx').on(table.userId),
    index('invoice_expires_at_idx').on(table.expiresAt),
  ],
)

export type Invoice = typeof invoice.$inferSelect
export type NewInvoice = typeof invoice.$inferInsert

export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number]
