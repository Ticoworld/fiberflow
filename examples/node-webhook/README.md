# FiberFlow webhook example (Node.js)

Minimal webhook receiver for local integration testing.

## Setup

1. Create a webhook in the FiberFlow dashboard.
2. Set the URL to your public endpoint, e.g. `https://your-ngrok-url/webhooks/fiberflow`.
3. Copy the signing secret (`whsec_...`).

## Run

```bash
FIBERFLOW_WEBHOOK_SECRET=whsec_your_secret node server.js
```

The server listens on port `4242` by default.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/webhooks/fiberflow` | Webhook receiver |

Fulfillment runs when `event.type === 'invoice.paid'`.

See [`docs/MERCHANT_INTEGRATION.md`](../../docs/MERCHANT_INTEGRATION.md) for the full integration guide.
