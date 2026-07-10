import Footer from "components/layout/footer";
import Price from "components/price";
import { getOrders } from "lib/commerce";
import { getSession } from "lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Account",
  description: "Your FiberFlow Store account and orders.",
};

async function AccountContent() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in?redirectTo=/account");
  }

  const orders = await getOrders(session.user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Account</h1>
      <p className="mb-8 text-neutral-500 dark:text-neutral-400">
        Signed in as {session.user.email}
      </p>

      <h2 className="mb-4 text-xl font-semibold">Orders</h2>
      {orders.length === 0 ? (
        <p className="text-neutral-500">
          No orders yet.{" "}
          <Link href="/search" className="underline">
            Browse the store
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex items-center justify-between py-4"
            >
              <div>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  Order {order.id.slice(0, 8)}
                </Link>
                <p className="text-sm text-neutral-500">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(order.createdAt))}{" "}
                  · {order.status}
                </p>
              </div>
              <Price
                amount={order.cost.totalAmount.amount}
                currencyCode={order.cost.totalAmount.currencyCode}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl px-4 py-12">
            <div className="mb-8 h-8 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-40 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
          </div>
        }
      >
        <AccountContent />
      </Suspense>
      <Footer />
    </>
  );
}
