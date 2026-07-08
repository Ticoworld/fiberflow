# Example FiberFlow webhook receiver

Minimal Node.js (Bun-compatible) server that:

1. Reads the **raw** request body
2. Verifies `X-FiberFlow-Signature`
3. Logs `invoice.paid` (fulfill your order here)

## Run

```bash
cd examples/node-webhook
FIBERFLOW_WEBHOOK_SECRET=whsec_your_secret bun run server.js
```

Listens on `http://127.0.0.1:8787/webhooks/fiberflow` by default.

Optional env:

| Variable | Default | Meaning |
|----------|---------|---------|
| `FIBERFLOW_WEBHOOK_SECRET` | (required) | Secret from the FiberFlow dashboard (`whsec_...`) |
| `PORT` | `8787` | Listen port |

Point a FiberFlow webhook at this URL (use ngrok for a public HTTPS URL when the API is not on localhost).

## Fulfillment

Only treat **`invoice.paid`** as confirmation. See [docs/MERCHANT_INTEGRATION.md](../../docs/MERCHANT_INTEGRATION.md).
