import type { MetadataRoute } from "next";
import { getPublishedProjects } from "@/lib/studio-data";
import { site } from "@/content/site";
import { getPublicPolicies } from "@/lib/policies";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const [projects,policies]=await Promise.all([getPublishedProjects(),getPublicPolicies()]);return["","/work","/pricing","/start-a-project",...(policies.length?["/policies"]:[]),...projects.map(p=>`/work/${p.slug}`),...policies.map(p=>`/policies/${p.slug}`)].map(path=>({url:`${site.url}${path}`,changeFrequency:path===""?"monthly":"yearly",priority:path===""?1:path==="/work"||path==="/pricing"?.9:.7}))}
