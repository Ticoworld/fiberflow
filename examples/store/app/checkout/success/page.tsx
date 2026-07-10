import Footer from "components/layout/footer";
import Price from "components/price";
import {
  getOrder,
  getOrderById,
  markOrderPaid,
} from "lib/commerce";
import { getFiberFlowInvoiceByOrderId } from "lib/fiberflow";
import { getSession } from "lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Payment received",
  description: "Your FiberFlow payment status.",
};

async function SuccessContent({
  searchParams,
}: {
  searchParams?: Promise<{ order?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in?redirectTo=/account");
  }

  const params = await searchParams;
  const orderId = params?.order;
  if (!orderId) {
    redirect("/account");
  }

  let order = await getOrder(orderId, session.user.id);
  if (!order) {
    redirect("/account");
  }

  if (order.status !== "paid") {
    try {
      const invoice = await getFiberFlowInvoiceByOrderId(orderId);
      if (invoice.status === "paid") {
        order = (await markOrderPaid(orderId)) ?? order;
      }
    } catch {
      // Webhook may still be in flight; show current local status.
    }
  }

  const fresh = (await getOrderById(orderId)) ?? order;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">
        {fresh.status === "paid" ? "Payment confirmed" : "Payment submitted"}
      </h1>
      <p className="mb-8 text-neutral-500 dark:text-neutral-400">
        {fresh.status === "paid"
          ? "Thanks — your FiberFlow payment is confirmed."
          : "FiberFlow is confirming your payment. This page updates when the webhook arrives."}
      </p>

      <div className="mb-8 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
        <p className="mb-2 text-sm text-neutral-500">
          Order {fresh.id.slice(0, 8)} · {fresh.status}
        </p>
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Total</span>
          <Price
            amount={fresh.cost.totalAmount.amount}
            currencyCode={fresh.cost.totalAmount.currencyCode}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          href={`/account/orders/${fresh.id}`}
          className="rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white"
        >
          View order
        </Link>
        <Link
          href="/search"
          className="rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium dark:border-neutral-700"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ order?: string }>;
}) {
  return (
    <>
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl px-4 py-12">
            <div className="mb-8 h-8 w-56 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-32 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
          </div>
        }
      >
        <SuccessContent searchParams={searchParams} />
      </Suspense>
      <Footer />
    </>
  );
}
