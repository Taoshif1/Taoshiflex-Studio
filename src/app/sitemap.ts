import type { MetadataRoute } from "next";
import { getPublishedProjects, getPublishedProducts } from "@/lib/studio-data";
import { site } from "@/content/site";
import { currentVersion, getPublicPolicies } from "@/lib/policies";
function safeDate(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
function newest(values: Array<string | null | undefined>) {
  const times = values.map(safeDate).filter((date): date is Date => Boolean(date)).map(date => date.getTime());
  return times.length ? new Date(Math.max(...times)) : undefined;
}
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, policies, products] = await Promise.all([getPublishedProjects(), getPublicPolicies(), getPublishedProducts()]);
  const policyDates = policies.map(policy => { const version = currentVersion(policy); return version.updated_at || version.published_at || policy.updated_at; });
  // Omit dates for marketing copy without an authoritative update timestamp.
  return [
    {url:site.url,changeFrequency:"monthly",priority:1},
    {url:site.url+"/work",lastModified:newest(projects.map(project=>project.updatedAt)),changeFrequency:"monthly",priority:.9},
    {url:site.url+"/products",lastModified:newest(products.map(product=>product.updatedAt)),changeFrequency:"monthly",priority:.9},
    ...["services","pricing","start-a-project"].map(path=>({url:site.url+"/"+path,changeFrequency:"monthly" as const,priority:.8})),
    {url:site.url+"/policies",lastModified:newest(policyDates),changeFrequency:"monthly",priority:.7},
    ...projects.map(project=>({url:site.url+"/work/"+project.slug,lastModified:safeDate(project.updatedAt),changeFrequency:"monthly" as const,priority:.8})),
    ...products.map(product=>({url:site.url+"/products/"+product.slug,lastModified:safeDate(product.updatedAt),changeFrequency:"monthly" as const,priority:.8})),
    ...policies.map((policy,index)=>({url:site.url+"/policies/"+policy.slug,lastModified:safeDate(policyDates[index]),changeFrequency:"yearly" as const,priority:.6})),
  ];
}
