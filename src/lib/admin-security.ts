import { sameOrigin as isSameOrigin, safeWebUrl } from "./security-contract";
import { rateLimit } from "./rate-limit";
import { getAdminAuthorization } from "./supabase-rest";

export { sameOrigin as isSameOrigin } from "./security-contract";

export async function authorizeMutation(request:Request){
  if(!isSameOrigin(request))return {error:Response.json({error:"Cross-origin request rejected."},{status:403})};
  const authorization=await getAdminAuthorization();
  if(!authorization)return {error:Response.json({error:"Unauthorized"},{status:401})};
  if(!rateLimit(`admin:${authorization.user.id}`,120,60_000))return {error:Response.json({error:"Too many requests."},{status:429})};
  return {...authorization,error:null};
}

export function cleanText(value:unknown,max:number,required=false){
  if(value===undefined||value===null)return required?null:"";
  if(typeof value!=="string")return null;
  const result=value.trim();
  if(result.length>max||required&&!result)return null;
  return result;
}

export function cleanUrl(value:unknown,max=500){
  const result=cleanText(value,max);
  if(result===null||result==="")return result;
  return safeWebUrl(result);
}
