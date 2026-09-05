import { authorizeMutation, cleanText } from "@/lib/admin-security";
import { parseStudioPresence } from "@/lib/studio-presence";
import { parseStudioAlertSettings } from "@/lib/studio-alert-settings";
import { supabaseRest } from "@/lib/supabase-rest";
import {
  CLIENT_WORKSPACE_MAINTENANCE_KEY,
  parseClientWorkspaceMaintenance,
} from "@/lib/client-workspace-maintenance-contract";

const categories=["services","pricing","process","projects"];
function validHandoff(value:string,request:Request){if(/^\/(?!\/)/.test(value))return true;try{return new URL(value).origin===new URL(request.url).origin}catch{return false}}
export async function PATCH(request:Request){
  const auth=await authorizeMutation(request);if(auth.error)return auth.error;
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(body?.key==="studio_alerts"){
    const value=parseStudioAlertSettings(body.value);
    if(!value)return Response.json({error:"Review the inquiry email alert settings."},{status:400});
    await supabaseRest("site_settings?on_conflict=key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({key:"studio_alerts",value,public:false})},true);
    return Response.json({ok:true});
  }
  if(body?.key==="studio_presence"){
    const value=parseStudioPresence(body.value);
    if(!value)return Response.json({error:"Review the Studio Presence fields and use safe HTTPS links."},{status:400});
    await supabaseRest("site_settings?on_conflict=key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({key:"studio_presence",value,public:true})},true);
    return Response.json({ok:true});
  }
  if(body?.key===CLIENT_WORKSPACE_MAINTENANCE_KEY){
    const value=parseClientWorkspaceMaintenance(body.value);
    if(!value)return Response.json({error:"Review the Client Workspace maintenance setting."},{status:400});
    await supabaseRest("site_settings?on_conflict=key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({key:CLIENT_WORKSPACE_MAINTENANCE_KEY,value,public:false})},true);
    return Response.json({ok:true});
  }
  if(body?.key!=="assistant"||!body.value||typeof body.value!=="object")return Response.json({error:"Invalid setting."},{status:400});
  const input=body.value as Record<string,unknown>,name=cleanText(input.name,80,true),greeting=cleanText(input.greeting,300,true),instructions=cleanText(input.instructions,2000,true),handoffUrl=cleanText(input.handoffUrl,300,true),knowledgeCategories=Array.isArray(input.knowledgeCategories)?input.knowledgeCategories.filter((item):item is string=>typeof item==="string"&&categories.includes(item)):null,maximumMessages=Number(input.maximumMessages);
  if(!name||!greeting||!instructions||!handoffUrl||!validHandoff(handoffUrl,request)||!knowledgeCategories?.length||!Number.isInteger(maximumMessages)||maximumMessages<2||maximumMessages>30||typeof input.enabled!=="boolean"||typeof input.showPricing!=="boolean"||typeof input.leadCapture!=="boolean"||typeof input.logConversations!=="boolean")return Response.json({error:"Review the assistant settings."},{status:400});
  const value={enabled:input.enabled,name,greeting,instructions,knowledgeCategories:[...new Set(knowledgeCategories)],showPricing:input.showPricing,leadCapture:input.leadCapture,handoffUrl,maximumMessages,logConversations:input.logConversations};
  await supabaseRest("site_settings?on_conflict=key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({key:"assistant",value,public:true})},true);
  return Response.json({ok:true});
}
