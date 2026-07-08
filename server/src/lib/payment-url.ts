function getPaymentAppOrigin(): string {
  const configured = process.env.PAYMENT_APP_URL?.trim()

  if (configured) {
    return configured.replace(/\/$/, '')
  }

  const corsOrigin = process.env.CORS_ORIGIN?.split(',')[0]?.trim()

  if (corsOrigin) {
    return corsOrigin.replace(/\/$/, '')
  }

  return 'http://localhost:5173'
}

export function buildPaymentUrl(paymentHash: string): string {
  return `${getPaymentAppOrigin()}/pay/${encodeURIComponent(paymentHash)}`
}
