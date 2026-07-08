# Connect your store

Use FiberFlow like a checkout provider: create a payment, send the customer to pay, fulfill when you get a paid webhook.

**You need from the FiberFlow dashboard**

1. An **API key** (`ffg_...`) — Settings  
2. A **webhook URL** on your store + the **signing secret** (`whsec_...`) — Webhooks  

There is no Shopify or WooCommerce plugin yet. Any site that can call an HTTPS API and receive a webhook works.

If FiberFlow is not running yet, start with [SELF_HOSTING.md](SELF_HOSTING.md). For a public HTTPS setup, see [DEPLOY.md](DEPLOY.md).

---

## For store owners (no developer yet)

You can still use FiberFlow today:

1. Finish [SELF_HOSTING.md](SELF_HOSTING.md) (or [DEPLOY.md](DEPLOY.md) on a VPS).  
2. Create invoices from the **dashboard** and send customers the payment link.  
3. When you are ready for automatic checkout on your site, hire or ask a developer and give them:

| Hand them | Where you get it |
|-----------|------------------|
| This document (`docs/MERCHANT_INTEGRATION.md`) | This repo |
| Your API base URL | Local: `http://localhost:3000` — production: `https://api.yourdomain.com` |
| API key (`ffg_...`) | Dashboard → Settings |
| Webhook signing secret (`whsec_...`) | Dashboard → Webhooks |
| Where to send webhooks | An HTTPS URL on **your** store that they will implement |
| Reminder | Fulfill only on **`invoice.paid`**; verify the signature |

Until that integration exists, treat dashboard invoices + payment links as a manual checkout path.

---

## Domains

| Hostname | Purpose |
|----------|---------|
| `example.com` | Landing page + merchant dashboard (no subdomain) |
| `api.example.com` | Merchant API + webhook delivery |
| `checkout.example.com` | Customer payment page |

Local development uses `http://localhost:5173` (landing, dashboard, and checkout) and `http://localhost:3000` (api).

---

## Typical checkout flow

```
Your store                FiberFlow API           Customer
    |                          |                     |
    |-- POST /v1/invoices ---->|                     |
    |<-- payment_url ----------|                     |
    |-- redirect ----------------------------------->|
    |                          |<-- pays on Fiber ---|
    |<-- POST invoice.paid ----|                     |
    |-- fulfill order          |                     |
```

On the checkout page, the customer sees the amount, a **QR code**, and a **payment address**. They pay with **any Fiber-compatible wallet** that can send to that address. FiberFlow does not ship a built-in wallet picker.

---

## Quick start

### 1. Create an API key

1. Open FiberFlow (`https://example.com` or `http://localhost:5173`), use **Get started** / **Sign in**, then open your store dashboard.
2. Open **Settings**.
3. Create an API key and copy the token (`ffg_...`). It is shown once.

### 2. Add a webhook endpoint

1. Open **Webhooks** in the sidebar (separate from Settings).
2. Add your server URL (must be HTTPS in production; `http://localhost…` is allowed for local testing).
3. Copy the signing secret (`whsec_...`).

Fulfill orders on **`invoice.paid`** only. Other events are informational:

| Event | When |
|-------|------|
| `invoice.created` | Invoice created via API |
| `invoice.received` | Payment seen, not yet confirmed |
| **`invoice.paid`** | **Payment confirmed — fulfill here** |
| `invoice.expired` | Invoice expired |
| `invoice.cancelled` | Invoice cancelled |

### 3. Create an invoice

```bash
curl -X POST https://api.example.com/v1/invoices \
  -H "Authorization: Bearer ffg_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_in_usd": 29.99,
    "order_id": "order_123",
    "customer_email": "buyer@example.com",
    "success_url": "https://your-store.com/thanks?order=order_123"
  }'
```

Example response (`201`):

```json
{
  "invoice": {
    "object": "invoice",
    "id": 42,
    "order_id": "order_123",
    "status": "open",
    "amount_in_usd": 29.99,
    "amount": "12345678",
    "currency": "fibt",
    "payment_hash": "0xabc...",
    "invoice_address": "fiber1...",
    "payment_url": "https://checkout.example.com/pay/0xabc...",
    "customer_email": "buyer@example.com",
    "description": null,
    "metadata": {},
    "success_url": "https://your-store.com/thanks?order=order_123",
    "cancel_url": null,
    "expiry_seconds": 7884000,
    "created_at": "2026-07-08T12:00:00.000Z",
    "updated_at": "2026-07-08T12:00:00.000Z"
  }
}
```

Notes:

- `amount_in_usd` is converted to CKB using a live price feed when the invoice is created.
- `currency` is `fibt` on testnet, `fibb` on mainnet, `fibd` on devnet.
- `amount` is the on-Fiber amount string (shannons / smallest unit as returned by the node).
- Redirect the customer to `invoice.payment_url`.

### 4. Handle webhooks

FiberFlow POSTs JSON to your webhook URL with these headers:

| Header | Description |
|--------|-------------|
| `X-FiberFlow-Signature` | HMAC signature (`t=<unix>,v1=<hex>`) |
| `X-FiberFlow-Event` | Event type (e.g. `invoice.paid`) |
| `X-FiberFlow-Delivery-Id` | Unique delivery id |

Example `invoice.paid` body:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "invoice.paid",
  "created_at": "2026-07-08T12:05:00.000Z",
  "data": {
    "invoice_id": 42,
    "order_id": "order_123",
    "payment_hash": "0xabc...",
    "amount_in_usd": 29.99,
    "status": "paid",
    "customer_email": "buyer@example.com",
    "metadata": {},
    "success_url": "https://your-store.com/thanks?order=order_123",
    "cancel_url": null,
    "payment_url": "https://checkout.example.com/pay/0xabc..."
  }
}
```

Return **HTTP 200** quickly. Process fulfillment asynchronously if needed. Failed deliveries are retried (up to 5 attempts with backoff).

#### Verify signatures (Node.js)

Read the **raw request body** before parsing JSON.

```javascript
import crypto from 'node:crypto'

export function verifyFiberFlowWebhook(rawBody, signatureHeader, secret) {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => part.trim().split('=')),
  )

  const timestamp = Number(parts.t)
  const signature = parts.v1

  if (!Number.isFinite(timestamp) || !signature) {
    return false
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp)
  if (age > 300) {
    return false
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex'),
  )
}
```

See [`examples/node-webhook/`](../examples/node-webhook/) for a runnable receiver.

---

## API reference

All merchant routes require:

```
Authorization: Bearer ffg_<your_api_key>
```

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/invoices` | Create invoice |
| `GET` | `/v1/invoices` | List invoices (`limit`, `starting_after`, `status`) |
| `GET` | `/v1/invoices/:id` | Get invoice by id |
| `GET` | `/v1/invoices/by-order/:orderId` | Get invoice by your order id |
| `POST` | `/v1/invoices/:id/cancel` | Cancel an open invoice |

### Create invoice body

| Field | Required | Description |
|-------|----------|-------------|
| `amount_in_usd` | Yes | Price in USD (e.g. `29.99`) |
| `order_id` | Yes | Your unique order reference (unique per store) |
| `customer_email` | Yes | Customer email |
| `description` | No | Payment description |
| `success_url` | No | After payment, checkout redirects here (if set) |
| `cancel_url` | No | Stored on the invoice and included in webhooks; **not** used by the checkout UI today |
| `metadata` | No | Key-value strings for your app (max 50 keys; key ≤ 40 chars; value ≤ 500 chars) |

### List query params

| Param | Description |
|-------|-------------|
| `limit` | Page size |
| `starting_after` | Invoice id cursor for pagination |
| `status` | `open`, `received`, `paid`, `expired`, or `cancelled` |

### Errors

```json
{
  "error": {
    "type": "invalid_request_error",
    "code": "order_id_already_exists",
    "message": "An invoice with order_id 'order_123' already exists.",
    "param": "order_id"
  }
}
```

---

## Example: wire this into a store backend

Pseudocode for a custom store (Node, Rails, Laravel, etc.):

```text
1. Customer clicks "Pay with Fiber" on your checkout.
2. Your server creates an order in your DB (status = pending).
3. Your server POST /v1/invoices with order_id, amount_in_usd, customer_email, success_url.
4. Your server redirects the browser to payment_url.
5. Webhook invoice.paid arrives → verify signature → mark order paid → ship / unlock download.
6. Optionally GET /v1/invoices/by-order/:orderId if the customer returns before the webhook.
```

Idempotency tip: treat `order_id` as your correlation key. `order_id` must be unique per store; reuse returns an error.

---

## Environment variables (operators)

**API server (`api.example.com`)**

```bash
BETTER_AUTH_URL=https://api.example.com
CORS_ORIGIN=https://example.com,https://checkout.example.com
PAYMENT_APP_URL=https://checkout.example.com
```

**Dashboard / checkout frontend build**

```bash
VITE_API_URL=https://api.example.com
VITE_PAYMENT_APP_URL=https://checkout.example.com
```

---

## Testing locally

1. Finish [SELF_HOSTING.md](SELF_HOSTING.md) through a **paid** test invoice (channel ready + Fiber-compatible wallet).  
2. Create a store, API key, and webhook pointing at the example receiver.  
3. Create an invoice from the dashboard or curl.  
4. Open the payment link and pay on Fiber **testnet**.  
5. Confirm your webhook receiver logs `invoice.paid`.

```bash
cd examples/node-webhook
FIBERFLOW_WEBHOOK_SECRET=whsec_... bun run server.js
```

Use [ngrok](https://ngrok.com) or similar to expose your local webhook receiver when testing against a remote FiberFlow API.

For production deployment, see [DEPLOY.md](DEPLOY.md).
