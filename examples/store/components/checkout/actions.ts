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

  const order = await createOrderFromCart(session.user.id);
  (await cookies()).delete("cartId");
  redirect(`/account/orders/${order.id}`);
}
