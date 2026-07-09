import OpengraphImage from "components/opengraph-image";
import { getPage } from "lib/commerce";

export default async function Image({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page: handle } = await params;
  const page = await getPage(handle);
  const title = page?.seo?.title || page?.title;

  return await OpengraphImage({ title });
}
