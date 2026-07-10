import Footer from "components/layout/footer";
import { AuthForm } from "components/auth/auth-form";
import { getSession } from "lib/session";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Create account",
  description: "Create a FiberFlow Store account.",
};

async function SignUpContent({
  searchParams,
}: {
  searchParams?: Promise<{ redirectTo?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/account");

  const params = await searchParams;
  const redirectTo = params?.redirectTo || "/account";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Create account</h1>
      <p className="mb-8 text-neutral-500 dark:text-neutral-400">
        Create an account to checkout and track your orders.
      </p>
      <AuthForm mode="sign-up" redirectTo={redirectTo} />
    </div>
  );
}

export default function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirectTo?: string }>;
}) {
  return (
    <>
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl px-4 py-12">
            <div className="mb-8 h-8 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-56 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
          </div>
        }
      >
        <SignUpContent searchParams={searchParams} />
      </Suspense>
      <Footer />
    </>
  );
}
