import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { HIDDEN_PRODUCT_TAG, TAGS } from "lib/constants";
import { db } from "lib/db";
import {
  cartItems,
  carts,
  collectionProducts,
  collections,
  productImages,
  productOptions,
  products,
  productVariants,
} from "lib/db/schema";
import { baseUrl } from "lib/utils";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import type {
  Cart,
  CartItem,
  Collection,
  Image,
  Product,
  ProductOption,
  ProductVariant,
} from "./types";

type ProductRow = typeof products.$inferSelect;
type OptionRow = typeof productOptions.$inferSelect;
type VariantRow = typeof productVariants.$inferSelect;
type ImageRow = typeof productImages.$inferSelect;

const emptyImage: Image = {
  url: "/window.svg",
  altText: "Product image",
  width: 1200,
  height: 1200,
};

function money(amount: string | number, currencyCode = "USD") {
  return {
    amount: Number(amount).toFixed(2),
    currencyCode,
  };
}

function reshapeImages(images: ImageRow[], productTitle: string): Image[] {
  return images
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((image) => ({
      url: image.url,
      altText: image.altText || productTitle,
      width: image.width,
      height: image.height,
    }));
}

function reshapeVariants(variants: VariantRow[]): ProductVariant[] {
  return variants
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((variant) => ({
      id: variant.id,
      title: variant.title,
      availableForSale: variant.availableForSale,
      selectedOptions: variant.selectedOptions,
      price: money(variant.priceAmount, variant.currencyCode),
    }));
}

function reshapeOptions(options: OptionRow[]): ProductOption[] {
  return options
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((option) => ({
      id: option.id,
      name: option.name,
      values: option.values,
    }));
}

function reshapeProduct(
  product: ProductRow,
  options: OptionRow[],
  variants: VariantRow[],
  images: ImageRow[],
  filterHiddenProducts = true,
): Product | undefined {
  if (
    !product ||
    (filterHiddenProducts && product.tags.includes(HIDDEN_PRODUCT_TAG))
  ) {
    return undefined;
  }

  const reshapedVariants = reshapeVariants(variants);
  const reshapedImages = reshapeImages(images, product.title);
  const amounts = reshapedVariants.map((variant) =>
    Number(variant.price.amount),
  );
  const currencyCode = reshapedVariants[0]?.price.currencyCode ?? "USD";
  const minAmount = amounts.length ? Math.min(...amounts) : 0;
  const maxAmount = amounts.length ? Math.max(...amounts) : 0;

  return {
    id: product.id,
    handle: product.handle,
    availableForSale: product.availableForSale,
    title: product.title,
    description: product.description,
    descriptionHtml: product.descriptionHtml,
    options: reshapeOptions(options),
    priceRange: {
      minVariantPrice: money(minAmount, currencyCode),
      maxVariantPrice: money(maxAmount, currencyCode),
    },
    variants: reshapedVariants,
    featuredImage: reshapedImages[0] ?? emptyImage,
    images: reshapedImages,
    seo: {
      title: product.seoTitle || product.title,
      description: product.seoDescription || product.description,
    },
    tags: product.tags,
    updatedAt: product.updatedAt.toISOString(),
  };
}

async function loadProductsByIds(productIds: string[]): Promise<Product[]> {
  if (!productIds.length) return [];

  const [productRows, optionRows, variantRows, imageRows] = await Promise.all([
    db.select().from(products).where(inArray(products.id, productIds)),
    db
      .select()
      .from(productOptions)
      .where(inArray(productOptions.productId, productIds)),
    db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds)),
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds)),
  ]);

  const byId = new Map(productRows.map((row) => [row.id, row]));
  const optionsByProduct = new Map<string, OptionRow[]>();
  const variantsByProduct = new Map<string, VariantRow[]>();
  const imagesByProduct = new Map<string, ImageRow[]>();

  for (const option of optionRows) {
    const list = optionsByProduct.get(option.productId) ?? [];
    list.push(option);
    optionsByProduct.set(option.productId, list);
  }

  for (const variant of variantRows) {
    const list = variantsByProduct.get(variant.productId) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.productId, list);
  }

  for (const image of imageRows) {
    const list = imagesByProduct.get(image.productId) ?? [];
    list.push(image);
    imagesByProduct.set(image.productId, list);
  }

  return productIds
    .map((id) => {
      const product = byId.get(id);
      if (!product) return undefined;
      return reshapeProduct(
        product,
        optionsByProduct.get(id) ?? [],
        variantsByProduct.get(id) ?? [],
        imagesByProduct.get(id) ?? [],
      );
    })
    .filter((product): product is Product => Boolean(product));
}

function sortProducts(
  productList: Product[],
  sortKey?: string,
  reverse?: boolean,
): Product[] {
  const sorted = [...productList];

  if (sortKey === "PRICE") {
    sorted.sort(
      (a, b) =>
        Number(a.priceRange.minVariantPrice.amount) -
        Number(b.priceRange.minVariantPrice.amount),
    );
  } else if (sortKey === "CREATED_AT" || sortKey === "CREATED") {
    sorted.sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );
  } else if (sortKey === "BEST_SELLING") {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  }

  return reverse ? sorted.reverse() : sorted;
}

async function buildCart(cartId: string): Promise<Cart | undefined> {
  const [cart] = await db.select().from(carts).where(eq(carts.id, cartId));
  if (!cart) return undefined;

  const lines = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      variantId: productVariants.id,
      variantTitle: productVariants.title,
      selectedOptions: productVariants.selectedOptions,
      priceAmount: productVariants.priceAmount,
      currencyCode: productVariants.currencyCode,
      productId: products.id,
      productHandle: products.handle,
      productTitle: products.title,
      imageUrl: productImages.url,
      imageAlt: productImages.altText,
      imageWidth: productImages.width,
      imageHeight: productImages.height,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(
      productImages,
      and(
        eq(productImages.productId, products.id),
        eq(productImages.position, 0),
      ),
    )
    .where(eq(cartItems.cartId, cartId));

  const cartLines: CartItem[] = lines.map((line) => {
    const unitAmount = Number(line.priceAmount);
    const currencyCode = line.currencyCode;
    return {
      id: line.id,
      quantity: line.quantity,
      cost: {
        totalAmount: money(unitAmount * line.quantity, currencyCode),
      },
      merchandise: {
        id: line.variantId,
        title: line.variantTitle,
        selectedOptions: line.selectedOptions,
        product: {
          id: line.productId,
          handle: line.productHandle,
          title: line.productTitle,
          featuredImage: {
            url: line.imageUrl ?? emptyImage.url,
            altText: line.imageAlt || line.productTitle,
            width: line.imageWidth ?? emptyImage.width,
            height: line.imageHeight ?? emptyImage.height,
          },
        },
      },
    };
  });

  const totalQuantity = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const currencyCode = cartLines[0]?.cost.totalAmount.currencyCode ?? "USD";
  const subtotal = cartLines.reduce(
    (sum, line) => sum + Number(line.cost.totalAmount.amount),
    0,
  );

  return {
    id: cart.id,
    checkoutUrl: `${baseUrl}/checkout`,
    cost: {
      subtotalAmount: money(subtotal, currencyCode),
      totalAmount: money(subtotal, currencyCode),
      totalTaxAmount: money(0, currencyCode),
    },
    lines: cartLines,
    totalQuantity,
  };
}

export async function createCart(): Promise<Cart> {
  const [cart] = await db.insert(carts).values({}).returning();
  if (!cart) {
    throw new Error("Failed to create cart");
  }

  return {
    id: cart.id,
    checkoutUrl: `${baseUrl}/checkout`,
    cost: {
      subtotalAmount: money(0),
      totalAmount: money(0),
      totalTaxAmount: money(0),
    },
    lines: [],
    totalQuantity: 0,
  };
}

export async function addToCart(
  lines: { merchandiseId: string; quantity: number }[],
): Promise<Cart> {
  const cartId = (await cookies()).get("cartId")?.value;
  if (!cartId) {
    throw new Error("Missing cartId cookie");
  }

  for (const line of lines) {
    const [existing] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.variantId, line.merchandiseId),
        ),
      );

    if (existing) {
      await db
        .update(cartItems)
        .set({ quantity: existing.quantity + line.quantity })
        .where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({
        cartId,
        variantId: line.merchandiseId,
        quantity: line.quantity,
      });
    }
  }

  const cart = await buildCart(cartId);
  if (!cart) {
    throw new Error("Cart not found");
  }
  return cart;
}

export async function removeFromCart(lineIds: string[]): Promise<Cart> {
  const cartId = (await cookies()).get("cartId")?.value;
  if (!cartId) {
    throw new Error("Missing cartId cookie");
  }

  if (lineIds.length) {
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.cartId, cartId), inArray(cartItems.id, lineIds)));
  }

  const cart = await buildCart(cartId);
  if (!cart) {
    throw new Error("Cart not found");
  }
  return cart;
}

export async function updateCart(
  lines: { id: string; merchandiseId: string; quantity: number }[],
): Promise<Cart> {
  const cartId = (await cookies()).get("cartId")?.value;
  if (!cartId) {
    throw new Error("Missing cartId cookie");
  }

  for (const line of lines) {
    if (line.quantity <= 0) {
      await db
        .delete(cartItems)
        .where(and(eq(cartItems.cartId, cartId), eq(cartItems.id, line.id)));
      continue;
    }

    await db
      .update(cartItems)
      .set({
        quantity: line.quantity,
        variantId: line.merchandiseId,
      })
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.id, line.id)));
  }

  const cart = await buildCart(cartId);
  if (!cart) {
    throw new Error("Cart not found");
  }
  return cart;
}

export async function getCart(): Promise<Cart | undefined> {
  const cartId = (await cookies()).get("cartId")?.value;
  if (!cartId) {
    return undefined;
  }

  return buildCart(cartId);
}

export async function getCollection(
  handle: string,
): Promise<Collection | undefined> {
  "use cache";
  cacheTag(TAGS.collections);
  cacheLife("hours");

  const [collection] = await db
    .select()
    .from(collections)
    .where(eq(collections.handle, handle));

  if (!collection) return undefined;

  return {
    handle: collection.handle,
    title: collection.title,
    description: collection.description,
    seo: {
      title: collection.seoTitle || collection.title,
      description: collection.seoDescription || collection.description,
    },
    updatedAt: collection.updatedAt.toISOString(),
    path: `/search/${collection.handle}`,
  };
}

export async function getCollectionProducts({
  collection,
  reverse,
  sortKey,
}: {
  collection: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  "use cache";
  cacheTag(TAGS.collections, TAGS.products);
  cacheLife("hours");

  const [collectionRow] = await db
    .select()
    .from(collections)
    .where(eq(collections.handle, collection));

  if (!collectionRow) {
    console.log(`No collection found for \`${collection}\``);
    return [];
  }

  const rows = await db
    .select({ productId: collectionProducts.productId })
    .from(collectionProducts)
    .where(eq(collectionProducts.collectionId, collectionRow.id))
    .orderBy(asc(collectionProducts.position));

  const productList = await loadProductsByIds(
    rows.map((row) => row.productId),
  );

  return sortProducts(productList, sortKey, reverse);
}

export async function getCollections(): Promise<Collection[]> {
  "use cache";
  cacheTag(TAGS.collections);
  cacheLife("hours");

  const rows = await db
    .select()
    .from(collections)
    .orderBy(asc(collections.title));

  return [
    {
      handle: "",
      title: "All",
      description: "All products",
      seo: {
        title: "All",
        description: "All products",
      },
      path: "/search",
      updatedAt: "1970-01-01T00:00:00.000Z",
    },
    ...rows
      .filter((collection) => !collection.handle.startsWith("hidden"))
      .map((collection) => ({
        handle: collection.handle,
        title: collection.title,
        description: collection.description,
        seo: {
          title: collection.seoTitle || collection.title,
          description: collection.seoDescription || collection.description,
        },
        updatedAt: collection.updatedAt.toISOString(),
        path: `/search/${collection.handle}`,
      })),
  ];
}

export async function getProduct(handle: string): Promise<Product | undefined> {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("hours");

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.handle, handle));

  if (!product) return undefined;

  const [options, variants, images] = await Promise.all([
    db
      .select()
      .from(productOptions)
      .where(eq(productOptions.productId, product.id)),
    db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, product.id)),
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, product.id)),
  ]);

  return reshapeProduct(product, options, variants, images, false);
}

export async function getProductRecommendations(
  productId: string,
): Promise<Product[]> {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("hours");

  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(ne(products.id, productId))
    .orderBy(desc(products.updatedAt))
    .limit(5);

  return loadProductsByIds(rows.map((row) => row.id));
}

export async function getProducts({
  query,
  reverse,
  sortKey,
}: {
  query?: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("hours");

  const filters = query
    ? or(
        ilike(products.title, `%${query}%`),
        ilike(products.description, `%${query}%`),
        sql`${query} = ANY(${products.tags})`,
      )
    : undefined;

  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(filters)
    .orderBy(desc(products.updatedAt));

  const productList = await loadProductsByIds(rows.map((row) => row.id));
  return sortProducts(productList, sortKey, reverse);
}

export async function revalidate(req: NextRequest): Promise<NextResponse> {
  const secret = req.nextUrl.searchParams.get("secret");

  if (!secret || secret !== process.env.REVALIDATION_SECRET) {
    console.error("Invalid revalidation secret.");
    return NextResponse.json({ status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    tags?: string[];
  };

  const tags = body.tags?.length
    ? body.tags
    : [TAGS.products, TAGS.collections];

  for (const tag of tags) {
    revalidateTag(tag, "max");
  }

  return NextResponse.json({ status: 200, revalidated: true, now: Date.now() });
}
