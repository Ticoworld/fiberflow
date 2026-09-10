import { getOrder } from "lib/commerce";
import {
  getPrivateApiEntitlementForOrder,
  isPrivateApiOrder,
  signPrivateApiEntitlement,
} from "lib/private-api-access";
import { getSession } from "lib/session";
import { canRetrievePrivateApiReceipt } from "lib/private-api-policy";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  const orderId = new URL(request.url).searchParams.get("order")?.trim();
  if (!orderId) {
    return Response.json({ error: "order_required" }, { status: 400 });
  }

  const order = await getOrder(orderId, session.user.id);
  if (!order || !isPrivateApiOrder(order)) {
    return Response.json({ error: "order_not_found" }, { status: 404 });
  }

  if (!canRetrievePrivateApiReceipt(order, session.user.id)) {
    return Response.json({ error: "payment_not_confirmed" }, { status: 403 });
  }

  if (!order.paymentHash) {
    return Response.json({ error: "access_not_ready" }, { status: 409 });
  }

  const entitlement = await getPrivateApiEntitlementForOrder(
    order.id,
    session.user.id,
    order.paymentHash,
  );
  if (!entitlement) {
    return Response.json({ error: "access_not_ready" }, { status: 409 });
  }

  return Response.json(
    {
      receipt: await signPrivateApiEntitlement(entitlement),
      resource_id: entitlement.resourceId,
      max_redemptions: entitlement.maxRedemptions,
      expires_at: new Date(entitlement.expiresAt * 1000).toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
