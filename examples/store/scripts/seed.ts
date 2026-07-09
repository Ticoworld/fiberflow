import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../lib/db/schema";

config({ path: [".env.local", ".env"] });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const db = drizzle(neon(connectionString), { schema });

const {
  carts,
  cartItems,
  collectionProducts,
  collections,
  menuItems,
  menus,
  pages,
  productImages,
  productOptions,
  products,
  productVariants,
} = schema;

async function seed() {
  await db.delete(cartItems);
  await db.delete(carts);
  await db.delete(collectionProducts);
  await db.delete(productImages);
  await db.delete(productVariants);
  await db.delete(productOptions);
  await db.delete(products);
  await db.delete(collections);
  await db.delete(menuItems);
  await db.delete(menus);
  await db.delete(pages);

  const catalog = [
    {
      handle: "fiber-hoodie",
      title: "Fiber Hoodie",
      description: "Soft midweight hoodie for builders who ship late.",
      descriptionHtml:
        "<p>Soft midweight hoodie for builders who ship late. Unisex fit with a clean front and durable cuffs.</p>",
      tags: ["apparel", "featured"],
      options: [{ name: "Size", values: ["S", "M", "L", "XL"] }],
      variants: [
        { title: "S", options: [{ name: "Size", value: "S" }], price: "48.00" },
        { title: "M", options: [{ name: "Size", value: "M" }], price: "48.00" },
        { title: "L", options: [{ name: "Size", value: "L" }], price: "48.00" },
        {
          title: "XL",
          options: [{ name: "Size", value: "XL" }],
          price: "48.00",
        },
      ],
      images: [
        {
          url: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&h=1200&fit=crop",
          altText: "Fiber Hoodie",
        },
      ],
    },
    {
      handle: "ckb-cap",
      title: "CKB Cap",
      description: "Structured cap with a low profile and adjustable strap.",
      descriptionHtml:
        "<p>Structured cap with a low profile and adjustable strap. Everyday wear for the Nervos stack.</p>",
      tags: ["apparel", "accessories"],
      options: [{ name: "Color", values: ["Black", "Stone"] }],
      variants: [
        {
          title: "Black",
          options: [{ name: "Color", value: "Black" }],
          price: "28.00",
        },
        {
          title: "Stone",
          options: [{ name: "Color", value: "Stone" }],
          price: "28.00",
        },
      ],
      images: [
        {
          url: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=1200&h=1200&fit=crop",
          altText: "CKB Cap",
        },
      ],
    },
    {
      handle: "lightning-mug",
      title: "Lightning Mug",
      description: "Ceramic mug for long sync sessions and hotter coffee.",
      descriptionHtml:
        "<p>Ceramic mug for long sync sessions and hotter coffee. Dishwasher safe with a matte exterior.</p>",
      tags: ["home", "featured"],
      options: [{ name: "Title", values: ["Default Title"] }],
      variants: [
        {
          title: "Default Title",
          options: [{ name: "Title", value: "Default Title" }],
          price: "18.00",
        },
      ],
      images: [
        {
          url: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=1200&h=1200&fit=crop",
          altText: "Lightning Mug",
        },
      ],
    },
    {
      handle: "node-tee",
      title: "Node Tee",
      description: "Lightweight cotton tee with a quiet node graphic.",
      descriptionHtml:
        "<p>Lightweight cotton tee with a quiet node graphic. Breathable fabric and a relaxed cut.</p>",
      tags: ["apparel"],
      options: [{ name: "Size", values: ["S", "M", "L"] }],
      variants: [
        { title: "S", options: [{ name: "Size", value: "S" }], price: "32.00" },
        { title: "M", options: [{ name: "Size", value: "M" }], price: "32.00" },
        { title: "L", options: [{ name: "Size", value: "L" }], price: "32.00" },
      ],
      images: [
        {
          url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&h=1200&fit=crop",
          altText: "Node Tee",
        },
      ],
    },
    {
      handle: "channel-socks",
      title: "Channel Socks",
      description: "Cushioned crew socks for standing desk days.",
      descriptionHtml:
        "<p>Cushioned crew socks for standing desk days. Soft knit with reinforced heels.</p>",
      tags: ["accessories"],
      options: [{ name: "Size", values: ["M", "L"] }],
      variants: [
        { title: "M", options: [{ name: "Size", value: "M" }], price: "14.00" },
        { title: "L", options: [{ name: "Size", value: "L" }], price: "14.00" },
      ],
      images: [
        {
          url: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=1200&h=1200&fit=crop",
          altText: "Channel Socks",
        },
      ],
    },
  ] as const;

  const insertedProducts = [];

  for (const item of catalog) {
    const [product] = await db
      .insert(products)
      .values({
        handle: item.handle,
        title: item.title,
        description: item.description,
        descriptionHtml: item.descriptionHtml,
        availableForSale: true,
        tags: [...item.tags],
        seoTitle: item.title,
        seoDescription: item.description,
      })
      .returning();

    if (!product) {
      throw new Error(`Failed to insert product ${item.handle}`);
    }

    for (const [index, option] of item.options.entries()) {
      await db.insert(productOptions).values({
        productId: product.id,
        name: option.name,
        values: [...option.values],
        position: index,
      });
    }

    for (const [index, variant] of item.variants.entries()) {
      await db.insert(productVariants).values({
        productId: product.id,
        title: variant.title,
        availableForSale: true,
        selectedOptions: [...variant.options],
        priceAmount: variant.price,
        currencyCode: "USD",
        position: index,
      });
    }

    for (const [index, image] of item.images.entries()) {
      await db.insert(productImages).values({
        productId: product.id,
        url: image.url,
        altText: image.altText,
        width: 1200,
        height: 1200,
        position: index,
      });
    }

    insertedProducts.push(product);
  }

  const collectionDefs = [
    {
      handle: "hidden-homepage-featured-items",
      title: "Homepage Featured",
      description: "Featured products for the homepage grid",
      productHandles: ["fiber-hoodie", "ckb-cap", "lightning-mug"],
    },
    {
      handle: "hidden-homepage-carousel",
      title: "Homepage Carousel",
      description: "Products for the homepage carousel",
      productHandles: [
        "fiber-hoodie",
        "ckb-cap",
        "lightning-mug",
        "node-tee",
        "channel-socks",
      ],
    },
    {
      handle: "apparel",
      title: "Apparel",
      description: "Shirts, hoodies, and more",
      productHandles: ["fiber-hoodie", "ckb-cap", "node-tee"],
    },
    {
      handle: "accessories",
      title: "Accessories",
      description: "Small goods for everyday use",
      productHandles: ["ckb-cap", "channel-socks", "lightning-mug"],
    },
  ] as const;

  for (const def of collectionDefs) {
    const [collection] = await db
      .insert(collections)
      .values({
        handle: def.handle,
        title: def.title,
        description: def.description,
        seoTitle: def.title,
        seoDescription: def.description,
      })
      .returning();

    if (!collection) {
      throw new Error(`Failed to insert collection ${def.handle}`);
    }

    for (const [index, handle] of def.productHandles.entries()) {
      const product = insertedProducts.find((row) => row.handle === handle);
      if (!product) continue;

      await db.insert(collectionProducts).values({
        collectionId: collection.id,
        productId: product.id,
        position: index,
      });
    }
  }

  await db.insert(pages).values([
    {
      handle: "about",
      title: "About",
      body: "<p>FiberFlow Store is a demo storefront backed by Neon Postgres and Drizzle.</p>",
      bodySummary: "A FiberFlow demo storefront backed by Neon and Drizzle.",
      seoTitle: "About",
      seoDescription: "About FiberFlow Store",
    },
    {
      handle: "faq",
      title: "FAQ",
      body: "<p><strong>How do I restock?</strong> Update rows in Neon or re-run <code>bun run db:seed</code>.</p><p><strong>Where is checkout?</strong> Cart checkout is a local demo page — wire FiberFlow payments next.</p>",
      bodySummary: "Common questions about the demo store.",
      seoTitle: "FAQ",
      seoDescription: "Frequently asked questions",
    },
  ]);

  const [headerMenu] = await db
    .insert(menus)
    .values({ handle: "next-js-frontend-header-menu" })
    .returning();
  const [footerMenu] = await db
    .insert(menus)
    .values({ handle: "next-js-frontend-footer-menu" })
    .returning();

  if (!headerMenu || !footerMenu) {
    throw new Error("Failed to insert menus");
  }

  await db.insert(menuItems).values([
    {
      menuId: headerMenu.id,
      title: "All",
      path: "/search",
      position: 0,
    },
    {
      menuId: headerMenu.id,
      title: "Apparel",
      path: "/search/apparel",
      position: 1,
    },
    {
      menuId: headerMenu.id,
      title: "Accessories",
      path: "/search/accessories",
      position: 2,
    },
    {
      menuId: footerMenu.id,
      title: "Home",
      path: "/",
      position: 0,
    },
    {
      menuId: footerMenu.id,
      title: "About",
      path: "/about",
      position: 1,
    },
    {
      menuId: footerMenu.id,
      title: "FAQ",
      path: "/faq",
      position: 2,
    },
    {
      menuId: footerMenu.id,
      title: "Terms",
      path: "/search",
      position: 3,
    },
  ]);

  console.log(
    `Seeded ${insertedProducts.length} products, ${collectionDefs.length} collections, 2 pages, and 2 menus.`,
  );
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
