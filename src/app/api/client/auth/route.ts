import { cookies } from "next/headers";
import { isSameOrigin, cleanText } from "@/lib/admin-security";
import { clientAccessCookie, clientRefreshCookie } from "@/lib/client-auth";
import { rateLimit } from "@/lib/rate-limit";
import { supabaseConfig, supabaseHeaders, verifySupabaseUserToken } from "@/lib/supabase-rest";

type AuthResult={access_token?:string;refresh_token?:string;expires_in?:number;error_description?:string;msg?:string};
async function setSession(result:AuthResult){if(!result.access_token||!await verifySupabaseUserToken(result.access_token))return false;const jar=await cookies(),secure=process.env.NODE_ENV==="production";jar.set(clientAccessCookie,result.access_token,{httpOnly:true,secure,sameSite:"lax",path:"/",maxAge:Math.min(result.expires_in??3600,3600)});if(result.refresh_token)jar.set(clientRefreshCookie,result.refresh_token,{httpOnly:true,secure,sameSite:"strict",path:"/api/client",maxAge:60*60*24*30});return true}
export async function POST(request:Request){
  if(!isSameOrigin(request))return Response.json({error:"Cross-origin request rejected."},{status:403});
  const ip=request.headers.get("x-forwarded-for")?.split(",")[0]??"local";
  if(!rateLimit(`client-auth:${ip}`,10,15*60*1000))return Response.json({error:"Too many attempts. Please wait and try again."},{status:429});
  const {url,publicKey}=supabaseConfig();if(!url||!publicKey)return Response.json({error:"Client access is not configured yet."},{status:503});
  const body=await request.json().catch(()=>null) as {action?:unknown;email?:unknown;token?:unknown;accessToken?:unknown;refreshToken?:unknown;expiresIn?:unknown}|null,action=cleanText(body?.action,20,true);
  if(action==="request"){
    const email=cleanText(body?.email,254,true)?.toLowerCase();if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return Response.json({error:"Enter a valid project-member email."},{status:400});
    const origin=new URL(request.url).origin,response=await fetch(`${url}/auth/v1/otp`,{method:"POST",headers:supabaseHeaders("public",{"Content-Type":"application/json"}),body:JSON.stringify({email,create_user:false,redirect_to:`${origin}/client/auth/callback`}),cache:"no-store"});
    if(!response.ok)return Response.json({error:"Access email could not be sent. Confirm that this email has a Supabase Auth account."},{status:400});return Response.json({ok:true});
  }
  if(action==="verify"){
    const email=cleanText(body?.email,254,true)?.toLowerCase(),token=cleanText(body?.token,12,true);if(!email||!token)return Response.json({error:"Email and verification code are required."},{status:400});
    const response=await fetch(`${url}/auth/v1/verify`,{method:"POST",headers:supabaseHeaders("public",{"Content-Type":"application/json"}),body:JSON.stringify({email,token,type:"email"}),cache:"no-store"}),result=await response.json() as AuthResult;
    if(!response.ok||!await setSession(result))return Response.json({error:"The verification code is invalid or expired."},{status:401});return Response.json({ok:true});
  }
  if(action==="session"){
    const accessToken=cleanText(body?.accessToken,5000,true),refreshToken=cleanText(body?.refreshToken,5000),expiresIn=Number(body?.expiresIn);if(!accessToken||!await setSession({access_token:accessToken,refresh_token:refreshToken||undefined,expires_in:Number.isFinite(expiresIn)?expiresIn:3600}))return Response.json({error:"The sign-in link is invalid or expired."},{status:401});return Response.json({ok:true});
  }
  return Response.json({error:"Invalid authentication action."},{status:400});
}
export async function DELETE(request:Request){if(!isSameOrigin(request))return Response.json({error:"Cross-origin request rejected."},{status:403});const jar=await cookies();jar.delete(clientAccessCookie);jar.set(clientRefreshCookie,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/client",maxAge:0});return Response.json({ok:true})}
