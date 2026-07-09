import Footer from "components/layout/footer";
import Price from "components/price";
import { getCart } from "lib/commerce";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Checkout",
  description: "Review your cart before paying.",
};

export default async function CheckoutPage() {
  const cart = await getCart();

  if (!cart || cart.totalQuantity === 0) {
    redirect("/search");
  }

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold">Checkout</h1>
        <p className="mb-8 text-neutral-500 dark:text-neutral-400">
          Demo checkout backed by Neon. Connect FiberFlow invoices when you are
          ready to take payments.
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

        <div className="flex gap-4">
          <Link
            href="/search"
            className="rounded-full border border-neutral-200 px-6 py-3 text-sm font-medium dark:border-neutral-700"
          >
            Continue shopping
          </Link>
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white opacity-60"
          >
            Pay with FiberFlow (coming soon)
          </button>
        </div>
      </div>
      <Footer />
    </>
  );
}
