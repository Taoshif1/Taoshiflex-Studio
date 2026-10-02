import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { rateLimit } from "./rate-limit";
import { supabaseRest, supabaseConfig } from "./supabase-rest";
// Netlify overwrites this header at its edge. Off Netlify use a shared budget.
export async function publicRateLimit(request: Request, scope: string, maximum: number, seconds: number) {
  const supplied = process.env.NETLIFY === "true" ? request.headers.get("x-nf-client-connection-ip") : null;
  const version = supplied && supplied.length <= 45 ? isIP(supplied) : 0;
  const ip = supplied && version
    ? new URL("http://" + (version === 6 ? "[" + supplied + "]" : supplied)).hostname
    : "shared";
  const {secretKey,legacyServiceRoleKey}=supabaseConfig();
  const key=createHmac("sha256",secretKey||legacyServiceRoleKey||"local-budget").update(scope+":"+ip).digest("hex");
  if(!rateLimit(key,maximum,seconds*1000))return false;
  if(process.env.NODE_ENV!=="production")return true;
  try { return await supabaseRest<boolean>("rpc/consume_request_budget",{method:"POST",body:JSON.stringify({budget_key:key,maximum,seconds})},"privileged"); }
  catch { return false; }
}
