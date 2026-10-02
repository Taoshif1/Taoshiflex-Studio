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
        <p className="eyebrow">Products / Built by the Studio</p>
        <h1 className="display">
          Ideas made<br />
          <span className="title-accent">into systems.</span>
        </h1>
        <div className="products-hero-foot">
          <p>
            Independent software with a clear purpose. Explore the tools and products we build,
            own and keep evolving.
          </p>
          <div className="products-hero-signals technical" aria-label="Studio product principles">
            <span>Designed in-house</span>
            <span>Built for real use</span>
            <span>Maintained as products</span>
          </div>
        </div>
      </header>

      <section aria-label="Studio products" className="products-showcase-list">
        {products.map((product, index) => (
          <MotionReveal key={product.id} className="product-reveal" delay={Math.min(index * 0.06, 0.18)}>
            <ProductCard product={product} index={index} variant="showcase" />
          </MotionReveal>
        ))}
      </section>

      {!products.length && (
        <div className="products-empty">
          <p className="eyebrow">In the making</p>
          <h2>The next chapter is taking shape.</h2>
          <p>Published products will appear here when they are ready to share.</p>
        </div>
      )}
    </div>
  );
}
