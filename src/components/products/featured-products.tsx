import Link from "next/link";
import { MotionReveal } from "@/components/motion/motion-reveal";
import type { Product } from "@/types/content";
import { ProductCard } from "./product-card";
export function FeaturedProducts({products}:{products:Product[]}) {
  if(!products.length)return null;
  return <section className="featured-products container" aria-labelledby="featured-products-title"><header><div><p className="eyebrow">Products / Built by the Studio</p><h2 id="featured-products-title">Our ideas. Out in the world.</h2></div><Link className="action" href="/products">Explore all products →</Link></header><div className="products-grid">{products.map(product=><MotionReveal key={product.id}><ProductCard product={product}/></MotionReveal>)}</div></section>;
}
