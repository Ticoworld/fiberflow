"use server";

import { createOrderFromCart } from "lib/commerce";
import { getSession } from "lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function placeOrder() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in?redirectTo=/checkout");
  }

  const order = await createOrderFromCart({
    userId: session.user.id,
    customerEmail: session.user.email,
    customerName: session.user.name,
  });

  (await cookies()).delete("cartId");

  if (!order.paymentUrl) {
    throw new Error("Missing FiberFlow payment URL");
  }

  redirect(order.paymentUrl);
}
