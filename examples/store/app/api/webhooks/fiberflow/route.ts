import {
  getOrderById,
  markOrderPaid,
  markOrderStatus,
} from "lib/commerce";
import {
  type FiberFlowWebhookEvent,
  verifyFiberFlowWebhook,
} from "lib/fiberflow";
import { issuePrivateApiEntitlement, isPrivateApiOrder } from "lib/private-api-access";
import { matchesPaidInvoiceForOrder } from "lib/private-api-policy";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-fiberflow-signature");

  if (!verifyFiberFlowWebhook(rawBody, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: FiberFlowWebhookEvent;
  try {
    payload = JSON.parse(rawBody) as FiberFlowWebhookEvent;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = payload.data?.order_id;
  if (!orderId) {
    return Response.json({ received: true });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return Response.json({ received: true });
  }

  switch (payload.type) {
    case "invoice.paid":
      if (!matchesPaidInvoiceForOrder(payload, order)) {
        return Response.json({ error: "Payment does not match order" }, { status: 400 });
      }
      const paymentRef = payload.data.payment_hash;
      if (typeof paymentRef !== "string") {
        return Response.json({ error: "Payment reference is missing" }, { status: 400 });
      }

      const paidOrder = await markOrderPaid(orderId);
      if (paidOrder && isPrivateApiOrder(paidOrder)) {
        await issuePrivateApiEntitlement({
          order: paidOrder,
          paymentRef,
        });
      }
      break;
    case "invoice.expired":
      await markOrderStatus(orderId, "expired");
      break;
    case "invoice.cancelled":
      await markOrderStatus(orderId, "cancelled");
      break;
    case "invoice.created":
    case "invoice.received":
      break;
    default: {
      const _exhaustive: never = payload.type;
      void _exhaustive;
      break;
    }
  }

  return Response.json({ received: true });
}
