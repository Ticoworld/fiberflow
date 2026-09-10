import type { Order } from "./commerce/types";
import type { FiberFlowWebhookEvent } from "./fiberflow";

import { PRIVATE_API_PRODUCT_ID, PRIVATE_API_RESOURCE_ID } from "./private-api-constants";

export function isPrivateApiOrder(order: Pick<Order, "items">): boolean {
  return order.items.some((item) => item.productId === PRIVATE_API_PRODUCT_ID);
}

export function matchesPaidInvoiceForOrder(
  payload: FiberFlowWebhookEvent,
  order: Pick<Order, "fiberflowInvoiceId" | "paymentHash">,
): boolean {
  return (
    payload.type === "invoice.paid" &&
    payload.data.status === "paid" &&
    typeof payload.data.payment_hash === "string" &&
    payload.data.invoice_id === order.fiberflowInvoiceId &&
    payload.data.payment_hash === order.paymentHash
  );
}

export function canRetrievePrivateApiReceipt(
  order: Pick<Order, "userId" | "status" | "items">,
  userId: string,
): boolean {
  return (
    order.userId === userId &&
    order.status === "paid" &&
    isPrivateApiOrder(order)
  );
}

export function privateApiEntitlementKey(
  orderId: string,
  paymentRef: string,
): string {
  return `${orderId}:${paymentRef}:${PRIVATE_API_RESOURCE_ID}`;
}
