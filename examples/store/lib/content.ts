import type { Menu, Page } from "lib/commerce/types";

export const headerMenu: Menu[] = [
  { title: "All", path: "/search" },
  { title: "Apparel", path: "/search/apparel" },
  { title: "Accessories", path: "/search/accessories" },
];

export const footerMenu: Menu[] = [
  { title: "Home", path: "/" },
  { title: "About", path: "/about" },
  { title: "FAQ", path: "/faq" },
];

const pages: Page[] = [
  {
    id: "about",
    handle: "about",
    title: "About",
    body: "<p>FiberFlow Store is a demo storefront backed by Neon Postgres and Drizzle.</p>",
    bodySummary: "A FiberFlow demo storefront backed by Neon and Drizzle.",
    seo: {
      title: "About",
      description: "About FiberFlow Store",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "faq",
    handle: "faq",
    title: "FAQ",
    body: "<p><strong>How do I restock?</strong> Update rows in Neon or re-run <code>bun run db:seed</code>.</p><p><strong>Where is checkout?</strong> Cart checkout is a local demo page — wire FiberFlow payments next.</p>",
    bodySummary: "Common questions about the demo store.",
    seo: {
      title: "FAQ",
      description: "Frequently asked questions",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export function getStaticMenu(handle: "header" | "footer"): Menu[] {
  switch (handle) {
    case "header":
      return headerMenu;
    case "footer":
      return footerMenu;
    default: {
      const _exhaustive: never = handle;
      return _exhaustive;
    }
  }
}

export function getStaticPage(handle: string): Page | undefined {
  return pages.find((page) => page.handle === handle);
}

export function getStaticPages(): Page[] {
  return pages;
}
