import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

import { store } from './store'

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'Open',
  'Received',
  'Paid',
  'Expired',
  'Cancelled',
])

export const invoiceCurrencyEnum = pgEnum('invoice_currency', [
  'fibb',
  'fibt',
  "fibd"
])

export const invoice = pgTable(
  'invoice',
  {
    id: serial('id').primaryKey(),
    amount: text('amount').notNull(),
    currency: invoiceCurrencyEnum('currency').notNull(),
    amountInUSD: bigint('amount_in_usd', { mode: 'number' }).notNull(),
    description: text('description'),
    expirySeconds: bigint('expiry_seconds', { mode: 'number' }).notNull().default(7884000), // 91 days
    paymentHash: text('payment_hash').unique(),
    invoiceAddress: text('invoice_address'),
    signature: text('signature'),
    status: invoiceStatusEnum('status').notNull().default('Open'),
    storeId: uuid('store_id').references(() => store.id, { onDelete: 'cascade' }),
    orderId: text('order_id').notNull(),
    customerEmail: text('customer_email').notNull(),
    metadata: jsonb('metadata').notNull().$type<Record<string, string>>().default({}),
    successUrl: text('success_url'),
    cancelUrl: text('cancel_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('invoice_status_idx').on(table.status),
    index('invoice_store_id_idx').on(table.storeId),
    unique('invoice_store_order_id_unique').on(table.storeId, table.orderId),
  ],
)

export type Invoice = typeof invoice.$inferSelect
export type NewInvoice = typeof invoice.$inferInsert

export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number]
export type InvoiceCurrency = (typeof invoiceCurrencyEnum.enumValues)[number]
