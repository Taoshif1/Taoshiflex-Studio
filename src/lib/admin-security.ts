import { getAdminAuthorization } from "./supabase-rest";

export function isSameOrigin(request:Request){
  const origin=request.headers.get("origin");
  const host=request.headers.get("x-forwarded-host")??request.headers.get("host");
  if(!origin||!host)return false;
  try{return new URL(origin).host===host}catch{return false}
}

export async function authorizeMutation(request:Request){
  if(!isSameOrigin(request))return {error:Response.json({error:"Cross-origin request rejected."},{status:403})};
  const authorization=await getAdminAuthorization();
  if(!authorization)return {error:Response.json({error:"Unauthorized"},{status:401})};
  return {...authorization,error:null};
}

export function cleanText(value:unknown,max:number,required=false){
  if(typeof value!=="string")return required?null:"";
  const result=value.trim();
  if(result.length>max||required&&!result)return null;
  return result;
}

export function cleanUrl(value:unknown,max=500){
  const result=cleanText(value,max);
  if(result===null||result==="")return result;
  try{const url=new URL(result);return url.protocol==="http:"||url.protocol==="https:"?url.toString():null}catch{return null}
}
