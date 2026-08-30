import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";

export async function PATCH(request:Request){
  if(!await getAdminSession()) return Response.json({error:"Unauthorized"},{status:401});
  const body=await request.json().catch(()=>null) as {id?:string;featured?:boolean;published?:boolean;sortOrder?:number}|null;
  if(!body?.id) return Response.json({error:"Project id is required."},{status:400});
  const update:Record<string,unknown>={updated_at:new Date().toISOString()};
  if(typeof body.featured==="boolean") update.featured=body.featured;
  if(typeof body.published==="boolean") update.published=body.published;
  if(Number.isFinite(body.sortOrder)) update.sort_order=body.sortOrder;
  await supabaseRest(`projects?id=eq.${encodeURIComponent(body.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(update)},true);
  return Response.json({ok:true});
}
