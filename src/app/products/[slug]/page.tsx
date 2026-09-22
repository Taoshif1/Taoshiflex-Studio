import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedProduct } from "@/lib/studio-data";
import { ResponsiveMedia, ActionLink } from "@/components/ui/primitives";
import { ProjectMediaViewer } from "@/components/work/project-media-viewer";
import { MotionReveal } from "@/components/motion/motion-reveal";
import "@/components/products/products.css";
type Props = {params:Promise<{slug:string}>};
export const dynamic = "force-dynamic";
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params;const product=await getPublishedProduct(slug);return product?{title:product.name,description:product.summary,alternates:{canonical:`/products/${slug}`},openGraph:{type:"website",title:product.name,description:product.summary,url:`/products/${slug}`}}:{}};
export default async function ProductPage({params}:Props) {
  const {slug}=await params;const product=await getPublishedProduct(slug);if(!product)notFound();
  const cover=product.media.find(item=>item.role==="cover");
  return <article className="product-detail container" style={{"--product-accent":product.accent} as CSSProperties}><header className="products-hero"><Link href="/products" className="eyebrow">← All products</Link><div className="product-meta"><span className="product-status">{product.status}</span><span>{product.category}</span></div><h1 className="display title-accent" style={{ "--title-accent": product.accent } as CSSProperties}>{product.name}</h1><p className="product-detail-tagline">{product.tagline}</p><p>{product.summary}</p><div className="product-links">{product.product_url && <a className="action action-solid" href={product.product_url} target="_blank" rel="noopener noreferrer">Explore the product ↗</a>}{product.repository_url && <a className="action" href={product.repository_url} target="_blank" rel="noopener noreferrer">Public repository ↗</a>}</div></header>
    {cover && <ResponsiveMedia accent={product.accent} media={cover} label={product.name} fit="contain" priority/>}
    {product.story && <MotionReveal><section className="product-story"><p className="eyebrow">The idea</p><h2>Built with intention.</h2><p>{product.story}</p></section></MotionReveal>}
    <div className="product-narrative">{product.problem && <MotionReveal><section><p className="eyebrow">01 / The problem</p><h2>Why it exists.</h2><p>{product.problem}</p></section></MotionReveal>}{product.solution && <MotionReveal><section><p className="eyebrow">02 / The solution</p><h2>A clearer way forward.</h2><p>{product.solution}</p></section></MotionReveal>}</div>
    {!!product.features.length && <section className="product-features"><p className="eyebrow">Inside the product</p><h2>Designed to do the work.</h2><ol>{product.features.map((feature,index)=><li key={feature}><span>{String(index+1).padStart(2,"0")}</span><h3>{feature}</h3></li>)}</ol></section>}
    {product.media.some(item=>item.role==="gallery") && <section className="product-gallery"><p className="eyebrow">A closer look</p><h2>The product in use.</h2><ProjectMediaViewer accent={product.accent} media={product.media.filter(item=>item.role==="gallery")} projectName={product.name}/></section>}
    <section className="product-system"><div><p className="eyebrow">Technology / System</p><h2>Under the surface.</h2><ul className="product-tags">{product.technologies.map(tech=><li key={tech}>{tech}</li>)}</ul></div><div><p className="eyebrow">Where it stands</p><h2>{product.status}</h2>{product.roadmap && <p>{product.roadmap}</p>}<dl>{product.pricing_model && <div><dt>Pricing model</dt><dd>{product.pricing_model}</dd></div>}{product.launch_date && <div><dt>Launch date</dt><dd>{product.launch_date}</dd></div>}</dl></div></section>
    <footer className="product-footer"><p className="eyebrow">Taoshiflex Studio</p><h2>Have a system in mind?</h2><ActionLink href="/start-a-project" solid>Build with the Studio</ActionLink></footer>
  </article>;
}
