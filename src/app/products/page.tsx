import type { Metadata } from "next";
import { getPublishedProducts } from "@/lib/studio-data";
import { ProductCard } from "@/components/products/product-card";
import { MotionReveal } from "@/components/motion/motion-reveal";
import "@/components/products/products.css";

export const metadata: Metadata = {title:"Products",description:"Independent software, tools and systems built by Taoshiflex Studio.",alternates:{canonical:"/products"},openGraph:{type:"website",title:"Products — Taoshiflex Studio",description:"Independent software, tools and systems built by Taoshiflex Studio.",url:"/products"}};
export const dynamic = "force-dynamic";
export default async function ProductsPage() {
  const products = await getPublishedProducts();
  return <div className="products-page container"><header className="products-hero"><p className="eyebrow">Products / Built by the Studio</p><h1 className="display">Ideas made<br/><span>into systems.</span></h1><p>Independent software with a clear purpose. Explore the tools and products we build, own and keep evolving.</p></header><section aria-label="Studio products" className="products-grid">{products.map(product => <MotionReveal key={product.id}><ProductCard product={product}/></MotionReveal>)}</section>{!products.length && <div className="products-empty"><p className="eyebrow">In the making</p><h2>The next chapter is taking shape.</h2><p>Published products will appear here when they are ready to share.</p></div>}</div>;
}
