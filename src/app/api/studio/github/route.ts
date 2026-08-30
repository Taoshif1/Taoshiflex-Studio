import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";

type GitHubRepo={id:number;name:string;full_name:string;html_url:string;homepage:string|null;description:string|null;private:boolean;updated_at:string;language:string|null;topics:string[]};
export async function GET(){
  if(!await getAdminSession()) return Response.json({error:"Unauthorized"},{status:401});
  const token=process.env.GITHUB_CURATOR_TOKEN;
  if(!token) return Response.json({error:"GITHUB_CURATOR_TOKEN is not configured."},{status:503});
  const response=await fetch("https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=100",{headers:{Authorization:`Bearer ${token}`,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},cache:"no-store"});
  if(!response.ok) return Response.json({error:"GitHub repositories could not be loaded."},{status:502});
  const repos=(await response.json() as GitHubRepo[]).map(({id,name,full_name,html_url,homepage,description,private:privateRepo,updated_at,language,topics})=>({id,name,fullName:full_name,url:html_url,homepage,description,private:privateRepo,updatedAt:updated_at,language,topics}));
  return Response.json({repositories:repos});
}

export async function POST(request:Request){
  if(!await getAdminSession()) return Response.json({error:"Unauthorized"},{status:401});
  const repo=await request.json().catch(()=>null) as {id?:number;name?:string;url?:string;homepage?:string|null;description?:string|null;updatedAt?:string;language?:string|null;topics?:string[]}|null;
  if(!repo?.id||!repo.name||!repo.url) return Response.json({error:"Invalid repository."},{status:400});
  const slug=repo.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const project={slug,name:repo.name.replace(/[-_]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()),client:"Internal / curated",category:"Digital Product",status:"Draft from GitHub",summary:repo.description||"A curated Taoshiflex Studio project.",content:{year:new Date(repo.updatedAt||Date.now()).getFullYear().toString(),context:"Add verified project context in Studio Admin.",challenge:"Add the verified business challenge before publishing.",approach:"Add the verified studio approach before publishing.",solution:"Add the verified solution before publishing.",result:"Add an honest current result before publishing.",capabilities:repo.language?[repo.language]:[],features:repo.topics??[],technicalNotes:[],media:[]},repository_url:repo.url,live_url:repo.homepage||null,github_repository_id:repo.id,github_updated_at:repo.updatedAt||new Date().toISOString(),featured:false,published:false,show_repository:false,sort_order:99};
  await supabaseRest("projects?on_conflict=github_repository_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(project)},true);
  return Response.json({ok:true,slug});
}
