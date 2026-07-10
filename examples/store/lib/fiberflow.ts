import { createHmac, timingSafeEqual } from "node:crypto";

export type FiberFlowInvoice = {
  object: "invoice";
  id: number;
  order_id: string;
  status: "open" | "received" | "paid" | "expired" | "cancelled";
  amount_in_usd: number;
  amount: string;
  currency: string;
  payment_hash: string | null;
  invoice_address: string | null;
  payment_url: string | null;
  customer_email: string;
  description: string | null;
  metadata: Record<string, string>;
  success_url: string | null;
  cancel_url: string | null;
  expiry_seconds: number;
  created_at: string;
  updated_at: string;
};

export type FiberFlowWebhookEvent = {
  id: string;
  type:
    | "invoice.created"
    | "invoice.received"
    | "invoice.paid"
    | "invoice.expired"
    | "invoice.cancelled";
  created_at: string;
  data: {
    invoice_id: number;
    order_id: string;
    payment_hash: string | null;
    amount_in_usd: number;
    status: FiberFlowInvoice["status"];
    customer_email: string;
    metadata: Record<string, string>;
    success_url: string | null;
    cancel_url: string | null;
    payment_url: string | null;
  };
};

type CreateInvoiceInput = {
  amountInUsd: number;
  orderId: string;
  customerEmail: string;
  description?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
};

function getApiBaseUrl() {
  return (
    process.env.FIBERFLOW_API_URL?.replace(/\/$/, "") ||
    "https://api.backr.site"
  );
}

function getApiKey() {
  const key = process.env.FIBERFLOW_API_KEY;
  if (!key) {
    throw new Error("FIBERFLOW_API_KEY is not configured");
  }
  return key;
}

async function fiberflowFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | T
    | { error?: { message?: string } }
    | null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? body.error?.message
        : undefined;
    throw new Error(
      message || `FiberFlow request failed (${response.status})`,
    );
  }

  return body as T;
}

export async function createFiberFlowInvoice(input: CreateInvoiceInput) {
  const result = await fiberflowFetch<{ invoice: FiberFlowInvoice }>(
    "/v1/invoices",
    {
      method: "POST",
      body: JSON.stringify({
        amount_in_usd: input.amountInUsd,
        order_id: input.orderId,
        customer_email: input.customerEmail,
        description: input.description,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: input.metadata,
      }),
    },
  );

  return result.invoice;
}

export async function getFiberFlowInvoiceByOrderId(orderId: string) {
  const result = await fiberflowFetch<{ invoice: FiberFlowInvoice }>(
    `/v1/invoices/by-order/${encodeURIComponent(orderId)}`,
  );
  return result.invoice;
}

export function verifyFiberFlowWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret = process.env.FIBERFLOW_WEBHOOK_SECRET,
) {
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );

  const timestamp = Number(parts.t);
  const signature = parts.v1;

  if (!Number.isFinite(timestamp) || !signature) {
    return false;
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > 300) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}
