# Merchant integration guide

FiberFlow lets your store accept Fiber payments. Your backend creates invoices via the API, redirects customers to the hosted checkout page, and fulfills orders when `invoice.paid` webhooks arrive.

## Domains

| Subdomain | Purpose |
|-----------|---------|
| `app.example.com` | Merchant dashboard |
| `api.example.com` | Merchant API + webhooks delivery |
| `checkout.example.com` | Customer payment page |

Local development uses `http://localhost:5173` (app + checkout) and `http://localhost:3000` (api).

## Quick start

### 1. Create an API key

1. Sign in to the FiberFlow dashboard.
2. Open **Settings → API keys**.
3. Create a key and copy the token (`ffg_...`). It is shown once.

### 2. Add a webhook endpoint

1. Open **Webhooks** in the dashboard.
2. Add your server URL (must be HTTPS in production).
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

Example response:

```json
{
  "invoice": {
    "object": "invoice",
    "id": 42,
    "order_id": "order_123",
    "status": "open",
    "amount_in_usd": 29.99,
    "payment_url": "https://checkout.example.com/pay/0xabc...",
    "invoice_address": "fiber1...",
    "payment_hash": "0xabc...",
    "success_url": "https://your-store.com/thanks?order=order_123",
    "cancel_url": null,
    "metadata": {},
    "created_at": "2026-07-08T12:00:00.000Z",
    "updated_at": "2026-07-08T12:00:00.000Z"
  }
}
```

Redirect the customer to `invoice.payment_url` to complete payment.

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

Return **HTTP 200** quickly. Process fulfillment asynchronously if needed.

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

## API reference (MVP)

All merchant routes require:

```
Authorization: Bearer ffg_<your_api_key>
```

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/invoices` | Create invoice |
| `GET` | `/v1/invoices/:id` | Get invoice by id |
| `GET` | `/v1/invoices/by-order/:orderId` | Get invoice by your order id |

### Create invoice body

| Field | Required | Description |
|-------|----------|-------------|
| `amount_in_usd` | Yes | Price in USD (e.g. `29.99`) |
| `order_id` | Yes | Your unique order reference |
| `customer_email` | Yes | Customer email |
| `description` | No | Payment description |
| `success_url` | No | Redirect after payment on checkout page |
| `cancel_url` | No | Stored on invoice (optional) |
| `metadata` | No | Key-value strings for your app |

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

## Environment variables

**API server (`api.example.com`)**

```bash
BETTER_AUTH_URL=https://api.example.com
CORS_ORIGIN=https://app.example.com,https://checkout.example.com
PAYMENT_APP_URL=https://checkout.example.com
```

**Dashboard (`app.example.com`)**

```bash
VITE_API_URL=https://api.example.com
VITE_PAYMENT_APP_URL=https://checkout.example.com
```

**Checkout (`checkout.example.com`)**

```bash
VITE_API_URL=https://api.example.com
```

## Testing locally

1. Start the server and frontend (see root README).
2. Create a store, API key, and webhook pointing to `examples/node-webhook`.
3. Create an invoice from the dashboard or curl.
4. Open the payment link and pay on Fiber testnet.
5. Confirm your webhook receiver logs `invoice.paid`.

```bash
cd examples/node-webhook
FIBERFLOW_WEBHOOK_SECRET=whsec_... bun run server.js
```

Use [ngrok](https://ngrok.com) or similar to expose your local webhook receiver when testing against a hosted FiberFlow API.
