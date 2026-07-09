import OpengraphImage from "components/opengraph-image";
import { getStaticPage } from "lib/content";

export default async function Image({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page: handle } = await params;
  const page = getStaticPage(handle);
  const title = page?.seo?.title || page?.title;

  return await OpengraphImage({ title });
}
