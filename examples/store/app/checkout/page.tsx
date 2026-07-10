import { PlaceOrderButton } from "components/checkout/place-order-button";
import Footer from "components/layout/footer";
import Price from "components/price";
import { getCart } from "lib/commerce";
import { getSession } from "lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Checkout",
  description: "Review your cart and place an order.",
};

async function CheckoutContent() {
  const [cart, session] = await Promise.all([getCart(), getSession()]);

  if (!cart || cart.totalQuantity === 0) {
    redirect("/search");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Checkout</h1>
      <p className="mb-8 text-neutral-500 dark:text-neutral-400">
        Review your cart and place an order. Payments can be wired to FiberFlow
        invoices later.
      </p>

      <ul className="mb-8 divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
        {cart.lines.map((item) => (
          <li key={item.id} className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">{item.merchandise.product.title}</p>
              <p className="text-sm text-neutral-500">
                {item.merchandise.title} × {item.quantity}
              </p>
            </div>
            <Price
              amount={item.cost.totalAmount.amount}
              currencyCode={item.cost.totalAmount.currencyCode}
            />
          </li>
        ))}
      </ul>

      <div className="mb-8 flex items-center justify-between text-lg font-semibold">
        <span>Total</span>
        <Price
          amount={cart.cost.totalAmount.amount}
          currencyCode={cart.cost.totalAmount.currencyCode}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/search"
          className="rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium dark:border-neutral-700"
        >
          Continue shopping
        </Link>
        {session?.user ? (
          <PlaceOrderButton />
        ) : (
          <Link
            href="/sign-in?redirectTo=/checkout"
            className="rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white"
          >
            Sign in to place order
          </Link>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
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
        <CheckoutContent />
      </Suspense>
      <Footer />
    </>
  );
}
