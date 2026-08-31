import { authorizeMutation, cleanText } from "@/lib/admin-security";
import { supabaseRest } from "@/lib/supabase-rest";
const statuses=["new","contacted","qualified","converted","closed"];
export async function PATCH(request:Request){const auth=await authorizeMutation(request);if(auth.error)return auth.error;const body=await request.json().catch(()=>null) as {id?:unknown;status?:unknown}|null;const id=cleanText(body?.id,80,true),status=cleanText(body?.status,20,true);if(!id||!status||!statuses.includes(status))return Response.json({error:"Invalid inquiry status."},{status:400});await supabaseRest(`inquiries?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status})},true);return Response.json({ok:true})}
