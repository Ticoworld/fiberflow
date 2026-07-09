import FooterMenu from "components/layout/footer-menu";
import LogoSquare from "components/logo-square";
import { getMenu } from "lib/commerce";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

const { COMPANY_NAME, SITE_NAME } = process.env;
const COPYRIGHT_START_YEAR = 2026;

async function FooterMenuFromCache() {
  const menu = await getMenu("next-js-frontend-footer-menu");
  return <FooterMenu menu={menu} />;
}

async function CopyrightDate() {
  await connection();
  const currentYear = new Date().getFullYear();
  return (
    <>
      {currentYear > COPYRIGHT_START_YEAR
        ? `${COPYRIGHT_START_YEAR}-${currentYear}`
        : COPYRIGHT_START_YEAR}
    </>
  );
}

export default function Footer() {
  const skeleton =
    "w-full h-6 animate-pulse rounded-sm bg-neutral-200 dark:bg-neutral-700";
  const copyrightName = COMPANY_NAME || SITE_NAME || "";

  return (
    <footer className="text-sm text-neutral-500 dark:text-neutral-400">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 border-t border-neutral-200 px-6 py-12 text-sm md:flex-row md:gap-12 md:px-4 min-[1320px]:px-0 dark:border-neutral-700">
        <div>
          <Link
            className="flex items-center gap-2 text-black md:pt-1 dark:text-white"
            href="/"
          >
            <LogoSquare size="sm" />
            <span className="uppercase">{SITE_NAME}</span>
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="flex h-[188px] w-[200px] flex-col gap-2">
              <div className={skeleton} />
              <div className={skeleton} />
              <div className={skeleton} />
              <div className={skeleton} />
              <div className={skeleton} />
              <div className={skeleton} />
            </div>
          }
        >
          <FooterMenuFromCache />
        </Suspense>
      </div>
      <div className="border-t border-neutral-200 py-6 text-sm dark:border-neutral-700">
        <div className="mx-auto flex w-full max-w-7xl px-4 md:px-4 min-[1320px]:px-0">
          <p>
            &copy;{" "}
            <Suspense fallback={<>{COPYRIGHT_START_YEAR}</>}>
              <CopyrightDate />
            </Suspense>{" "}
            {copyrightName}
            {copyrightName.length && !copyrightName.endsWith(".") ? "." : ""}{" "}
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
