import { authorizeMutation, cleanText } from "@/lib/admin-security";
import { supabaseRest } from "@/lib/supabase-rest";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const audiences=["public","client","both"];
const validDate=(value:unknown)=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:null;

export async function POST(request:Request){
  const auth=await authorizeMutation(request); if(auth.error)return auth.error;
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  const slug=cleanText(body?.slug,80,true),title=cleanText(body?.title,160,true),audience=cleanText(body?.audience,12,true),summary=cleanText(body?.summary,500),content=cleanText(body?.content,100000),sortOrder=Number(body?.sortOrder)||0;
  if(!slug||!slugPattern.test(slug)||!title||!audience||!audiences.includes(audience)||summary===null||content===null)return Response.json({error:"Review the policy draft fields."},{status:400});
  try{await supabaseRest("rpc/create_policy_draft",{method:"POST",body:JSON.stringify({policy_slug:slug,policy_title:title,policy_summary:summary,policy_content:content,policy_audience:audience,policy_effective_date:validDate(body?.effectiveDate),policy_sort_order:sortOrder})},{userAccessToken:auth.token});return Response.json({ok:true})}
  catch{return Response.json({error:"Policy could not be created. Check the slug is unique."},{status:409})}
}

export async function PATCH(request:Request){
  const auth=await authorizeMutation(request); if(auth.error)return auth.error;
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null,kind=cleanText(body?.kind,30,true);
  try{
    if(kind==="version"){
      const id=cleanText(body?.id,40,true),title=cleanText(body?.title,160,true),summary=cleanText(body?.summary,500),content=cleanText(body?.content,100000),audience=cleanText(body?.audience,12,true);
      if(!id||!uuid.test(id)||!title||summary===null||content===null||!audience||!audiences.includes(audience))return Response.json({error:"Review the policy fields."},{status:400});
      await supabaseRest(`policy_versions?id=eq.${id}&published_at=is.null`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({title,summary,content,audience,effective_date:validDate(body?.effectiveDate)})},"privileged");
      return Response.json({ok:true});
    }
    if(kind==="publish"){
      const id=cleanText(body?.id,40,true); if(!id||!uuid.test(id)||typeof body?.publish!=="boolean")return Response.json({error:"Valid publish action required."},{status:400});
      await supabaseRest("rpc/set_policy_version_published",{method:"POST",body:JSON.stringify({target_version_id:id,publish:body.publish})},{userAccessToken:auth.token}); return Response.json({ok:true});
    }
    if(kind==="new-version"){
      const policyId=cleanText(body?.policyId,40,true); if(!policyId||!uuid.test(policyId))return Response.json({error:"Valid policy required."},{status:400});
      await supabaseRest("rpc/create_policy_version",{method:"POST",body:JSON.stringify({source_policy_id:policyId})},{userAccessToken:auth.token}); return Response.json({ok:true});
    }
    if(kind==="policy"){
      const policyId=cleanText(body?.policyId,40,true),slug=cleanText(body?.slug,80,true),sortOrder=Number(body?.sortOrder)||0;
      if(!policyId||!uuid.test(policyId)||!slug||!slugPattern.test(slug))return Response.json({error:"Valid policy details required."},{status:400});
      await supabaseRest(`policies?id=eq.${policyId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({slug,sort_order:sortOrder,archived_at:body?.archived?new Date().toISOString():null})},"privileged"); return Response.json({ok:true});
    }
    return Response.json({error:"Unsupported policy action."},{status:400});
  }catch{return Response.json({error:"Policy action could not be completed."},{status:409})}
}

export async function DELETE(request:Request){
  const auth=await authorizeMutation(request); if(auth.error)return auth.error;
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null,id=cleanText(body?.id,40,true);
  if(!id||!uuid.test(id))return Response.json({error:"Valid draft required."},{status:400});
  try{await supabaseRest(`policy_versions?id=eq.${id}&published_at=is.null`,{method:"DELETE",headers:{Prefer:"return=minimal"}},"privileged");return Response.json({ok:true})}
  catch{return Response.json({error:"Published, acknowledged, or final policy drafts cannot be deleted. Archive the policy instead."},{status:409})}
}
