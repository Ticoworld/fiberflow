import { Carousel } from "components/carousel";
import { ThreeItemGrid } from "components/grid/three-items";
import Footer from "components/layout/footer";
import { Suspense } from "react";

export const metadata = {
  description: "FiberFlow storefront powered by Neon and Drizzle.",
  openGraph: {
    type: "website",
  },
};

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <ThreeItemGrid />
      </Suspense>
      <Suspense fallback={null}>
        <Carousel />
      </Suspense>
      <Footer />
    </>
  );
}
