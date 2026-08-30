import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";

export async function PATCH(request:Request){
  if(!await getAdminSession()) return Response.json({error:"Unauthorized"},{status:401});
  const body=await request.json().catch(()=>null) as {key?:string;value?:unknown;public?:boolean}|null;
  if(!body?.key||body.value===undefined) return Response.json({error:"Invalid setting."},{status:400});
  await supabaseRest("site_settings?on_conflict=key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({key:body.key,value:body.value,public:Boolean(body.public)})},true);
  return Response.json({ok:true});
}
