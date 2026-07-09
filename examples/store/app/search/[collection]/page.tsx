import { getCollection, getCollectionProducts, getCollections } from "lib/commerce";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import Grid from "components/grid";
import ProductGridItems from "components/layout/product-grid-items";
import { defaultSort, sorting } from "lib/constants";

export async function generateStaticParams() {
  const collections = await getCollections();
  return collections
    .filter((collection) => collection.handle)
    .map((collection) => ({ collection: collection.handle }));
}

export async function generateMetadata(props: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const collection = await getCollection(params.collection);

  if (!collection) return notFound();

  return {
    title: collection.seo?.title || collection.title,
    description:
      collection.seo?.description ||
      collection.description ||
      `${collection.title} products`,
  };
}

async function CategoryProducts({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ collection }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve(undefined),
  ]);
  const { sort } = (resolvedSearchParams ?? {}) as { [key: string]: string };
  const { sortKey, reverse } =
    sorting.find((item) => item.slug === sort) || defaultSort;
  const products = await getCollectionProducts({
    collection,
    sortKey,
    reverse,
  });

  if (products.length === 0) {
    return (
      <section>
        <p className="py-3 text-lg">No products found in this collection</p>
      </section>
    );
  }

  return (
    <section>
      <Grid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <ProductGridItems products={products} />
      </Grid>
    </section>
  );
}

export default function CategoryPage(props: {
  params: Promise<{ collection: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={null}>
      <CategoryProducts
        params={props.params}
        searchParams={props.searchParams}
      />
    </Suspense>
  );
}
