import { projects as localProjects } from "@/content/projects";
import { servicePackages as localPackages } from "@/content/pricing";
import type { Project, ServicePackage } from "@/types/content";
import { isSupabasePublicConfigured, supabaseRest } from "./supabase-rest";

export async function getPublishedProjects(): Promise<Project[]> {
  if (!isSupabasePublicConfigured()) return localProjects.filter((project) => project.slug !== "redflint");
  try {
    const rows = await supabaseRest<Array<Record<string, unknown>>>("projects?published=eq.true&select=*&order=sort_order.asc");
    return rows.length ? rows.map(mapProject) : localProjects.filter((project) => project.slug !== "redflint");
  } catch { return localProjects.filter((project) => project.slug !== "redflint"); }
}

export async function getFeaturedProjects() {
  return (await getPublishedProjects()).filter((project) => project.featured !== false);
}

export async function getPublishedProject(slug:string) {
  return (await getPublishedProjects()).find((project) => project.slug === slug);
}

export async function getActivePackages(): Promise<ServicePackage[]> {
  if (!isSupabasePublicConfigured()) return localPackages.filter((item) => item.enabled);
  try {
    const rows = await supabaseRest<Array<Record<string, unknown>>>("service_packages?enabled=eq.true&select=*,package_features(*)&order=sort_order.asc");
    return rows.length ? rows.map((row) => ({ id:String(row.id),slug:String(row.slug),name:String(row.name),priceFrom:row.price_from === null ? null : Number(row.price_from),currency:"BDT",description:String(row.description),features:Array.isArray(row.package_features) ? row.package_features.sort((a,b)=>Number(a.sort_order)-Number(b.sort_order)).map((feature)=>String(feature.label)) : [],deliveryEstimate:String(row.delivery_estimate),revisions:row.revisions ? String(row.revisions) : undefined,support:row.support ? String(row.support) : undefined,category:String(row.category),featured:Boolean(row.featured),enabled:Boolean(row.enabled),sortOrder:Number(row.sort_order) })) : localPackages.filter((item) => item.enabled);
  } catch { return localPackages.filter((item) => item.enabled); }
}

function mapProject(row:Record<string,unknown>):Project {
  const content = (row.content ?? {}) as Partial<Project>;
  return { ...content, slug:String(row.slug),name:String(row.name),category:String(row.category) as Project["category"],status:String(row.status),summary:String(row.summary),client:String(row.client ?? content.client ?? row.name),year:String(content.year ?? new Date(String(row.created_at)).getFullYear()),context:String(row.context ?? content.context ?? ""),challenge:String(row.challenge ?? content.challenge ?? ""),approach:String(row.approach ?? content.approach ?? ""),solution:String(row.solution ?? content.solution ?? ""),result:String(row.result ?? content.result ?? ""),capabilities:Array.isArray(row.services) ? row.services as string[] : content.capabilities ?? [],features:Array.isArray(row.features) ? row.features as string[] : content.features ?? [],technicalNotes:Array.isArray(row.technical_notes) ? row.technical_notes as string[] : content.technicalNotes ?? [],accent:String(row.accent ?? "#b89055"),media:content.media ?? [],repositoryUrl:row.repository_url ? String(row.repository_url) : undefined,showRepository:Boolean(row.show_repository),liveUrl:row.live_url ? String(row.live_url) : undefined,featured:Boolean(row.featured),published:Boolean(row.published),sortOrder:Number(row.sort_order),id:String(row.id),createdAt:String(row.created_at),updatedAt:String(row.updated_at) };
}
