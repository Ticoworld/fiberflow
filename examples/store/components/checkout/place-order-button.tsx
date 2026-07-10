"use client";

import { placeOrder } from "components/checkout/actions";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? "Redirecting…" : "Pay with FiberFlow"}
    </button>
  );
}

export function PlaceOrderButton() {
  return (
    <form action={placeOrder}>
      <SubmitButton />
    </form>
  );
}
