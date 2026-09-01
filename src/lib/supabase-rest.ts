import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

type SupabaseAccess = "public"|"privileged"|{userAccessToken:string}|true;
export type SupabaseUser={id:string;email?:string};
export class SupabaseRestError extends Error{constructor(public status:number,public code?:string,public databaseMessage?:string){super(`Supabase request failed (${status})`);this.name="SupabaseRestError"}}
export const supabaseConfig=()=>({url:process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/,""),publicKey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secretKey:process.env.SUPABASE_SECRET_KEY,legacyServiceRoleKey:process.env.SUPABASE_SERVICE_ROLE_KEY});
const isLegacyJwt=(key:string)=>key.startsWith("eyJ")&&key.split(".").length===3;

export function supabaseHeaders(access:SupabaseAccess="public",additional:HeadersInit={}){
  if(access===true)access="privileged"; // Transitional compatibility for existing internal call sites.
  const {publicKey,secretKey,legacyServiceRoleKey}=supabaseConfig();
  const headers=new Headers(additional);
  if(access==="public"){
    if(!publicKey)throw new Error("Supabase publishable key is not configured");
    headers.set("apikey",publicKey);
  }else if(access==="privileged"){
    const key=secretKey||legacyServiceRoleKey;
    if(!key)throw new Error("Supabase secret key is not configured");
    headers.set("apikey",key);
    if(!secretKey&&legacyServiceRoleKey&&isLegacyJwt(legacyServiceRoleKey))headers.set("Authorization",`Bearer ${legacyServiceRoleKey}`);
  }else{
    if(!publicKey)throw new Error("Supabase publishable key is not configured");
    headers.set("apikey",publicKey);
    headers.set("Authorization",`Bearer ${access.userAccessToken}`);
  }
  return headers;
}

export function isSupabasePublicConfigured(){const {url,publicKey}=supabaseConfig();return Boolean(url&&publicKey)}
export function isSupabaseServerConfigured(){const {url,secretKey,legacyServiceRoleKey}=supabaseConfig();return Boolean(url&&(secretKey||legacyServiceRoleKey))}

export async function supabaseRest<T>(path:string,init:RequestInit={},access:SupabaseAccess="public"):Promise<T>{
  const {url}=supabaseConfig();if(!url)throw new Error("Supabase URL is not configured");
  const response=await fetch(`${url}/rest/v1/${path}`,{...init,headers:supabaseHeaders(access,{"Content-Type":"application/json",...Object.fromEntries(new Headers(init.headers).entries())}),cache:"no-store"});
  if(!response.ok){const failure=await response.json().catch(()=>null) as {code?:unknown;message?:unknown}|null;throw new SupabaseRestError(response.status,typeof failure?.code==="string"?failure.code:undefined,typeof failure?.message==="string"?failure.message:undefined)}
  const text=await response.text();return(text?JSON.parse(text):null)as T;
}

export async function verifyStudioAdminToken(token:string|undefined){
  const {url}=supabaseConfig();if(!token||!url||!isSupabasePublicConfigured()||!isSupabaseServerConfigured())return null;
  const userResponse=await fetch(`${url}/auth/v1/user`,{headers:supabaseHeaders({userAccessToken:token}),cache:"no-store"});
  if(!userResponse.ok)return null;const user=await userResponse.json()as SupabaseUser;if(!user.id)return null;
  const adminResponse=await fetch(`${url}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(user.id)}&select=user_id&limit=1`,{headers:supabaseHeaders("privileged"),cache:"no-store"});
  if(!adminResponse.ok||((await adminResponse.json())as unknown[]).length===0)return null;return user;
}
export async function provisionSupabaseUser(email:string,password:string){
  const {url,secretKey,legacyServiceRoleKey}=supabaseConfig(),key=secretKey||legacyServiceRoleKey;
  if(!url||!key)throw new Error("Supabase server access is not configured");
  const client=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
  const {data,error}=await client.auth.admin.createUser({email,password,email_confirm:true});
  if(error)throw error;
  if(!data.user?.id)throw new Error("Supabase did not return the provisioned user");
  return {id:data.user.id,email:data.user.email};
}
export async function getAdminAuthorization(){const token=(await cookies()).get("studio_access_token")?.value;const user=await verifyStudioAdminToken(token);return user&&token?{user,token}:null}
export async function getAdminSession(){return (await getAdminAuthorization())?.user??null}
