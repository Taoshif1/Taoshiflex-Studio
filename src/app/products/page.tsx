import { T } from "@/i18n/language-context";
import type { Metadata } from "next";
import { getPublishedProducts } from "@/lib/studio-data";
import { ProductCard } from "@/components/products/product-card";
import { MotionReveal } from "@/components/motion/motion-reveal";
import "@/components/products/products.css";

export const metadata: Metadata = {
  title: "Products",
  description: "Independent software, tools and systems built by Taoshiflex Studio.",
  alternates: { canonical: "/products" },
  openGraph: {
    type: "website",
    title: "Products — Taoshiflex Studio",
    description: "Independent software, tools and systems built by Taoshiflex Studio.",
    url: "/products",
  },
};

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getPublishedProducts();

  return (
    <div className="products-page container">
      <header className="products-hero products-index-hero">
        <p className="eyebrow"><T id="products.productsBuiltByTheStudio"/></p>
        <h1 className="display"> <T id="products.ideasMade"/><br />
          <span className="title-accent"><T id="products.intoSystems"/></span>
        </h1>
        <div className="products-hero-foot">
          <p> <T id="products.independentSoftwareWithAClearPurposeExploreTheTools"/> </p>
          <div className="products-hero-signals technical">
            <span><T id="products.designedInHouse"/></span>
            <span><T id="products.builtForRealUse"/></span>
            <span><T id="products.maintainedAsProducts"/></span>
          </div>
        </div>
      </header>

      <section aria-labelledby="products-showcase-title" className="products-showcase-list"><h2 className="sr-only" id="products-showcase-title"><T id="products.productsBuiltByTheStudio"/></h2>
        {products.map((product, index) => (
          <MotionReveal key={product.id} className="product-reveal" delay={Math.min(index * 0.06, 0.18)}>
            <ProductCard product={product} index={index} variant="showcase" />
          </MotionReveal>
        ))}
      </section>

      {!products.length && (
        <div className="products-empty">
          <p className="eyebrow"><T id="products.inTheMaking"/></p>
          <h2><T id="products.theNextChapterIsTakingShape"/></h2>
          <p><T id="products.publishedProductsWillAppearHereWhenTheyAreReady"/></p>
        </div>
      )}
    </div>
  );
}
