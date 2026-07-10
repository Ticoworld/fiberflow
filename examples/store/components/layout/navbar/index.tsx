import { UserMenu } from "components/auth/user-menu";
import CartModal from "components/cart/modal";
import OpenCart from "components/cart/open-cart";
import LogoSquare from "components/logo-square";
import { headerMenu } from "lib/content";
import { getSession } from "lib/session";
import Link from "next/link";
import { Suspense } from "react";
import MobileMenu from "./mobile-menu";
import Search, { SearchSkeleton } from "./search";

const { SITE_NAME } = process.env;

async function NavbarAuth() {
  const session = await getSession();
  return (
    <UserMenu
      user={
        session?.user
          ? { name: session.user.name, email: session.user.email }
          : null
      }
    />
  );
}

export function Navbar() {
  return (
    <nav className="relative flex items-center justify-between p-4 lg:px-6">
      <div className="block flex-none md:hidden">
        <Suspense fallback={null}>
          <MobileMenu menu={headerMenu} />
        </Suspense>
      </div>
      <div className="flex w-full items-center">
        <div className="flex w-full md:w-1/3">
          <Link
            href="/"
            prefetch={true}
            className="mr-2 flex w-full items-center justify-center md:w-auto lg:mr-6"
          >
            <LogoSquare />
            <div className="ml-2 flex-none text-sm font-medium uppercase md:hidden lg:block">
              {SITE_NAME}
            </div>
          </Link>
          {headerMenu.length ? (
            <ul className="hidden gap-6 text-sm md:flex md:items-center">
              {headerMenu.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.path}
                    prefetch={true}
                    className="text-neutral-500 underline-offset-4 hover:text-black hover:underline dark:text-neutral-400 dark:hover:text-neutral-300"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="hidden justify-center md:flex md:w-1/3">
          <Suspense fallback={<SearchSkeleton />}>
            <Search />
          </Suspense>
        </div>
        <div className="flex items-center justify-end md:w-1/3">
          <Suspense fallback={null}>
            <NavbarAuth />
          </Suspense>
          <Suspense fallback={<OpenCart />}>
            <CartModal />
          </Suspense>
        </div>
      </div>
    </nav>
  );
}
