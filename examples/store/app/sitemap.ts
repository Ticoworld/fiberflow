import { getCollections, getPages, getProducts } from "lib/commerce";
import { baseUrl, validateEnvironmentVariables } from "lib/utils";
import { MetadataRoute } from "next";

type Route = {
  url: string;
  lastModified: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";

  validateEnvironmentVariables();

  const routesMap = [""].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
  }));

  const [collections, products, pages] = await Promise.all([
    getCollections(),
    getProducts({}),
    getPages(),
  ]);

  const collectionRoutes: Route[] = collections.map((collection) => ({
    url: `${baseUrl}${collection.path}`,
    lastModified: collection.updatedAt,
  }));

  const productRoutes: Route[] = products.map((product) => ({
    url: `${baseUrl}/product/${product.handle}`,
    lastModified: product.updatedAt,
  }));

  const pageRoutes: Route[] = pages.map((page) => ({
    url: `${baseUrl}/${page.handle}`,
    lastModified: page.updatedAt,
  }));

  return [...routesMap, ...collectionRoutes, ...productRoutes, ...pageRoutes];
}
