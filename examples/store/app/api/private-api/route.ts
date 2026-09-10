import { redeemPrivateApiReceiptForOrder } from "lib/private-api-access";
import { PRIVATE_API_MAX_REDEMPTIONS, PRIVATE_API_RESOURCE_ID } from "lib/private-api-constants";
import { getSession } from "lib/session";

function bearerToken(request: Request): string | undefined {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/u);
  return match?.[1];
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  const token = bearerToken(request);
  if (!token) {
    return Response.json({ error: "access_denied" }, { status: 401 });
  }

  const redemption = await redeemPrivateApiReceiptForOrder({
    token,
    subject: session.user.id,
  });

  if (redemption.status === "success") {
    return Response.json(
      {
        resource_id: PRIVATE_API_RESOURCE_ID,
        message: "Private API response authorized by FiberLatch.",
        max_redemptions: PRIVATE_API_MAX_REDEMPTIONS,
        exhausted: redemption.exhausted,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (redemption.status === "system_failure") {
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }

  return Response.json({ error: "access_denied" }, { status: 403 });
}
