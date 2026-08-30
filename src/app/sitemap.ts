import type { MetadataRoute } from "next";
import { projects } from "@/content/projects";
import { site } from "@/content/site";
export default function sitemap():MetadataRoute.Sitemap{return["","/work","/start-a-project",...projects.map(p=>`/work/${p.slug}`)].map(path=>({url:`${site.url}${path}`,changeFrequency:path===""?"monthly":"yearly",priority:path===""?1:path==="/work"?.9:.7}))}
