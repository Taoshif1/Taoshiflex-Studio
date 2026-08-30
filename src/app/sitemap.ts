import type { MetadataRoute } from "next";
import { getPublishedProjects } from "@/lib/studio-data";
import { site } from "@/content/site";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const projects=await getPublishedProjects();return["","/work","/pricing","/start-a-project",...projects.map(p=>`/work/${p.slug}`)].map(path=>({url:`${site.url}${path}`,changeFrequency:path===""?"monthly":"yearly",priority:path===""?1:path==="/work"||path==="/pricing"?.9:.7}))}
