import { projects as localProjects } from "@/content/projects";
import { servicePackages as localPackages } from "@/content/pricing";
import type { AssistantSettings, Project, ServicePackage } from "@/types/content";
import { isSupabasePublicConfigured, supabaseRest } from "./supabase-rest";

export async function getPublishedProjects(): Promise<Project[]> {
  if (!isSupabasePublicConfigured()) return localProjects.filter((project) => project.slug !== "redflint");
  try {
    const rows = await supabaseRest<Array<Record<string, unknown>>>("projects?published=eq.true&select=*&order=sort_order.asc");
    return rows.map(mapProject);
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
    return rows.map((row) => ({ id:String(row.id),slug:String(row.slug),name:String(row.name),priceFrom:row.price_from === null ? null : Number(row.price_from),currency:"BDT",description:String(row.description),features:Array.isArray(row.package_features) ? row.package_features.sort((a,b)=>Number(a.sort_order)-Number(b.sort_order)).map((feature)=>String(feature.label)) : [],deliveryEstimate:String(row.delivery_estimate),revisions:row.revisions ? String(row.revisions) : undefined,support:row.support ? String(row.support) : undefined,category:String(row.category),featured:Boolean(row.featured),enabled:Boolean(row.enabled),sortOrder:Number(row.sort_order) }));
  } catch { return localPackages.filter((item) => item.enabled); }
}

const assistantDefaults:AssistantSettings={enabled:true,name:"Studio Assistant",greeting:"What are you planning to build? Ask about scope, pricing or process.",instructions:"Be concise, honest and direct.",knowledgeCategories:["services","pricing","process","projects"],showPricing:true,leadCapture:true,handoffUrl:"/start-a-project",maximumMessages:8,logConversations:false};
export async function getAssistantSettings():Promise<AssistantSettings>{
  if(!isSupabasePublicConfigured())return assistantDefaults;
  try{const rows=await supabaseRest<Array<{value?:Partial<AssistantSettings>}>>("site_settings?key=eq.assistant&public=eq.true&select=value&limit=1");return rows[0]?.value?{...assistantDefaults,...rows[0].value}:{...assistantDefaults,enabled:false}}catch{return assistantDefaults}
}

function mapProject(row:Record<string,unknown>):Project {
  const content = (row.content ?? {}) as Partial<Project>;
  return { ...content, slug:String(row.slug),name:String(row.name),category:String(row.category) as Project["category"],status:String(row.status),summary:String(row.summary),client:String(row.client ?? content.client ?? row.name),year:String(content.year ?? new Date(String(row.created_at)).getFullYear()),context:String(row.context ?? content.context ?? ""),challenge:String(row.challenge ?? content.challenge ?? ""),approach:String(row.approach ?? content.approach ?? ""),solution:String(row.solution ?? content.solution ?? ""),result:String(row.result ?? content.result ?? ""),capabilities:Array.isArray(row.services) ? row.services as string[] : content.capabilities ?? [],features:Array.isArray(row.features) ? row.features as string[] : content.features ?? [],technicalNotes:Array.isArray(row.technical_notes) ? row.technical_notes as string[] : content.technicalNotes ?? [],accent:String(row.accent ?? "#b89055"),media:content.media ?? [],repositoryUrl:row.repository_url ? String(row.repository_url) : undefined,showRepository:Boolean(row.show_repository),liveUrl:row.live_url ? String(row.live_url) : undefined,featured:Boolean(row.featured),published:Boolean(row.published),sortOrder:Number(row.sort_order),id:String(row.id),createdAt:String(row.created_at),updatedAt:String(row.updated_at) };
}
