"use client";

import { authClient } from "lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function UserMenu({
  user,
}: {
  user: { name: string; email: string } | null;
}) {
  const router = useRouter();

  if (!user) {
    return (
      <div className="mr-2 hidden items-center gap-3 text-sm md:flex">
        <Link
          href="/sign-in"
          className="text-neutral-500 underline-offset-4 hover:text-black hover:underline dark:text-neutral-400 dark:hover:text-neutral-300"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mr-2 hidden items-center gap-3 text-sm md:flex">
      <Link
        href="/account"
        className="max-w-[120px] truncate text-neutral-500 underline-offset-4 hover:text-black hover:underline dark:text-neutral-400 dark:hover:text-neutral-300"
      >
        {user.name || user.email}
      </Link>
      <button
        type="button"
        className="text-neutral-500 underline-offset-4 hover:text-black hover:underline dark:text-neutral-400 dark:hover:text-neutral-300"
        onClick={async () => {
          await authClient.signOut();
          router.refresh();
        }}
      >
        Sign out
      </button>
    </div>
  );
}
