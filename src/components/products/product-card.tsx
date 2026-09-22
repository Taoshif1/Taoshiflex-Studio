import Link from "next/link";
import type { CSSProperties } from "react";
import type { Product } from "@/types/content";
import { ResponsiveMedia } from "@/components/ui/primitives";
import "./products.css";

export function ProductCard({ product }: { product: Product }) {
  const cover = product.media.find(item => item.role === "cover");
  return <article className="product-card" style={{"--product-accent":product.accent} as CSSProperties}>
    <div className="product-card-visual">{cover ? <ResponsiveMedia accent={product.accent} label={product.name} media={cover}/> : <div className="product-monogram" aria-hidden="true">{product.name.slice(0,1)}<span>Built by Taoshiflex Studio</span></div>}</div>
    <div className="product-card-body"><div className="product-meta"><span className="product-status">{product.status}</span><span>{product.category}</span></div><h2><Link href={`/products/${product.slug}`}>{product.name}</Link></h2><p className="product-tagline">{product.tagline}</p><p>{product.summary}</p><ul className="product-tags">{product.features.slice(0,3).map(feature => <li key={feature}>{feature}</li>)}</ul><div className="product-links"><Link href={`/products/${product.slug}`}>Explore product <span aria-hidden="true">→</span></Link>{product.status === "Live" && product.product_url && <a href={product.product_url} target="_blank" rel="noopener noreferrer">Visit product ↗</a>}</div></div>
  </article>;
}
