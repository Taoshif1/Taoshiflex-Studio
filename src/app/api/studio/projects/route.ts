import { authorizeMutation, cleanText, cleanUrl } from "@/lib/admin-security";
import { removeProjectMedia } from "@/lib/project-media";
import { supabaseRest } from "@/lib/supabase-rest";

const categories=["Commerce","Business System","Digital Product","Website"];
const placeholder=/add (?:a |an |the )?verified|add an honest|curated taoshiflex studio project/i;
const list=(value:unknown)=>Array.isArray(value)?value.slice(0,30).map(item=>cleanText(item,160,true)).filter((item):item is string=>Boolean(item)):null;

export async function PATCH(request:Request){
  const auth=await authorizeMutation(request);if(auth.error)return auth.error;
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const id=cleanText(body?.id,80,true),slug=cleanText(body?.slug,80,true),name=cleanText(body?.name,160,true),client=cleanText(body?.client,160,true),category=cleanText(body?.category,80,true),status=cleanText(body?.status,100,true),summary=cleanText(body?.summary,500,true),context=cleanText(body?.context,4000,true),challenge=cleanText(body?.challenge,2000,true),approach=cleanText(body?.approach,4000,true),solution=cleanText(body?.solution,4000,true),result=cleanText(body?.result,2000,true),repositoryUrl=cleanUrl(body?.repositoryUrl),liveUrl=cleanUrl(body?.liveUrl),accent=cleanText(body?.accent,20,true),capabilities=list(body?.capabilities),features=list(body?.features),technicalNotes=list(body?.technicalNotes);
  if(!id||!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!name||!client||!category||!categories.includes(category)||!status||!summary||!context||!challenge||!approach||!solution||!result||repositoryUrl===null||liveUrl===null||!accent||!/^#[0-9a-f]{6}$/i.test(accent)||!capabilities||!features||!technicalNotes||!["draft","published","featured"].includes(String(body?.visibility))||typeof body?.showRepository!=="boolean"||!Number.isInteger(body?.sortOrder))return Response.json({error:"Review the required project fields and formats."},{status:400});
  const published=body!.visibility==="published"||body!.visibility==="featured",featured=body!.visibility==="featured";
  if(published&&[summary,context,challenge,approach,solution,result].some(value=>placeholder.test(value)))return Response.json({error:"Replace every GitHub placeholder with verified editorial content before publishing."},{status:409});
  const existing=await supabaseRest<Array<{content?:Record<string,unknown>}>>(`projects?id=eq.${encodeURIComponent(id)}&select=content&limit=1`,{},true);
  if(!existing.length)return Response.json({error:"Project not found."},{status:404});
  const content={...(existing[0].content??{}),context,challenge,approach,solution,result,capabilities,features,technicalNotes};
  try{await supabaseRest(`projects?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({slug,name,client,category,status,summary,content,repository_url:repositoryUrl||null,show_repository:body.showRepository,live_url:liveUrl||null,accent,featured,published,sort_order:body.sortOrder,updated_at:new Date().toISOString()})},true)}catch{return Response.json({error:"Project could not be saved. Check that the slug is unique."},{status:409})}
  return Response.json({ok:true});
}

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function DELETE(request:Request){
  const auth=await authorizeMutation(request);if(auth.error)return auth.error;
  const body=await request.json().catch(()=>null) as {id?:unknown;confirmName?:unknown}|null,id=cleanText(body?.id,80,true),confirmName=cleanText(body?.confirmName,160,true);
  if(!id||!uuid.test(id)||!confirmName)return Response.json({error:"Valid project id and confirmation name are required."},{status:400});
  const projects=await supabaseRest<Array<{id:string;name:string}>>(`projects?id=eq.${encodeURIComponent(id)}&select=id,name&limit=1`,{},true),project=projects[0];
  if(!project)return Response.json({error:"Project not found."},{status:404});if(confirmName!==project.name)return Response.json({error:"Project name confirmation does not match."},{status:409});
  let media:Array<{storage_path:string}>;try{media=await supabaseRest<Array<{storage_path:string}>>(`project_media?project_id=eq.${encodeURIComponent(id)}&select=storage_path`,{},true)}catch{return Response.json({error:"Could not verify project media. Deletion was stopped safely."},{status:409})}
  try{await removeProjectMedia(media.map(item=>item.storage_path).filter(Boolean));await supabaseRest(`projects?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:{Prefer:"return=minimal"}},true);return Response.json({ok:true})}catch(error){return Response.json({error:error instanceof Error?error.message:"Project could not be deleted."},{status:409})}
}