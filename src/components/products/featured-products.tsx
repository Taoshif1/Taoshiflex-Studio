import { T } from "@/i18n/language-context";
import Link from "next/link";
import { MotionReveal } from "@/components/motion/motion-reveal";
import type { Product } from "@/types/content";
import { ProductCard } from "./product-card";

export function FeaturedProducts({ products }: { products: Product[] }) {
  if (!products.length) return null;

  return (
    <section className="featured-products container" aria-labelledby="featured-products-title">
      <header>
        <div>
          <p className="eyebrow"><T id="products.featured.productsBuiltByTheStudio"/></p>
          <h2 id="featured-products-title"><T id="products.featured.ourIdeasOutInTheWorld"/></h2>
        </div>
        <Link className="action" href="/products"><T id="products.featured.exploreAllProducts"/></Link>
      </header>

      <div className="products-grid">
        {products.map((product, index) => (
          <MotionReveal key={product.id} delay={Math.min(index * 0.05, 0.15)}>
            <ProductCard product={product} index={index} variant="compact" />
          </MotionReveal>
        ))}
      </div>
    </section>
  );
}
