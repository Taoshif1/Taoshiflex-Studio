import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/supabase-rest";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request:Request){
  if(!rateLimit(`studio-auth:${request.headers.get("x-forwarded-for")??"local"}`,8,15*60*1000)) return Response.json({error:"Too many attempts."},{status:429});
  const {url,publicKey}=supabaseConfig();
  if(!url||!publicKey) return Response.json({error:"Supabase is not configured."},{status:503});
  const body=await request.json().catch(()=>null) as {email?:string;password?:string}|null;
  if(!body?.email||!body.password) return Response.json({error:"Email and password are required."},{status:400});
  const response=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:publicKey,"Content-Type":"application/json"},body:JSON.stringify({email:body.email,password:body.password}),cache:"no-store"});
  const result=await response.json() as {access_token?:string;expires_in?:number;error_description?:string};
  if(!response.ok||!result.access_token) return Response.json({error:"Invalid credentials."},{status:401});
  const admin=await fetch(`${url}/rest/v1/admin_users?select=user_id`,{headers:{apikey:publicKey,Authorization:`Bearer ${result.access_token}`},cache:"no-store"});
  if(!admin.ok||((await admin.json()) as unknown[]).length===0) return Response.json({error:"This account is not a Studio admin."},{status:403});
  (await cookies()).set("studio_access_token",result.access_token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:Math.min(result.expires_in??3600,3600)});
  return Response.json({ok:true});
}

export async function DELETE(){(await cookies()).delete("studio_access_token");return Response.json({ok:true})}
