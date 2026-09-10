import Footer from "components/layout/footer";
import Price from "components/price";
import { getOrder } from "lib/commerce";
import { getSession } from "lib/session";
import { isPrivateApiOrder } from "lib/private-api-access";
import { PrivateApiDemo } from "./private-api-demo";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Order",
  description: "Order details.",
};

async function OrderContent({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in?redirectTo=/account");
  }

  const { id } = await params;
  const order = await getOrder(id, session.user.id);
  if (!order) return notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/account"
        className="mb-6 inline-block text-sm text-neutral-500 underline-offset-4 hover:underline"
      >
        ← Back to account
      </Link>
      <h1 className="mb-2 text-3xl font-bold">Order {order.id.slice(0, 8)}</h1>
      <p className="mb-8 text-neutral-500 dark:text-neutral-400">
        {new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(order.createdAt))}{" "}
        · {order.status}
      </p>

      <ul className="mb-8 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">{item.productTitle}</p>
              <p className="text-sm text-neutral-500">
                {item.variantTitle} × {item.quantity}
              </p>
            </div>
            <Price
              amount={item.totalAmount.amount}
              currencyCode={item.totalAmount.currencyCode}
            />
          </li>
        ))}
      </ul>

      <div className="mb-8 flex items-center justify-between text-lg font-semibold">
        <span>Total</span>
        <Price
          amount={order.cost.totalAmount.amount}
          currencyCode={order.cost.totalAmount.currencyCode}
        />
      </div>

      {order.status === "awaiting_payment" && order.paymentUrl ? (
        <a
          href={order.paymentUrl}
          className="inline-flex rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white"
        >
          Continue payment on FiberFlow
        </a>
      ) : null}

      {order.status === "paid" && isPrivateApiOrder(order) ? (
        <PrivateApiDemo orderId={order.id} />
      ) : null}
    </div>
  );
}

export default function OrderPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <>
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl px-4 py-12">
            <div className="mb-8 h-8 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-40 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
          </div>
        }
      >
        <OrderContent params={props.params} />
      </Suspense>
      <Footer />
    </>
  );
}
