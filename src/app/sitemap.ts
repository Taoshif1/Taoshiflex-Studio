import type { MetadataRoute } from "next";
import { getPublishedProjects, getPublishedProducts } from "@/lib/studio-data";
import { site } from "@/content/site";
import { getPublicPolicies } from "@/lib/policies";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const [projects,policies,products]=await Promise.all([getPublishedProjects(),getPublicPolicies(),getPublishedProducts()]);return["","/work","/products","/pricing","/start-a-project",...(policies.length?["/policies"]:[]),...projects.map(p=>`/work/${p.slug}`),...products.map(p=>`/products/${p.slug}`),...policies.map(p=>`/policies/${p.slug}`)].map(path=>({url:`${site.url}${path}`,changeFrequency:path===""?"monthly":"yearly",priority:path===""?1:path==="/work"||path==="/pricing"?.9:.7}))}
