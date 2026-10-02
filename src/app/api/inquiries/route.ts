import { readJson } from "@/lib/request-body";
import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { isSupabaseServerConfigured, supabaseRest } from "@/lib/supabase-rest";

import { dispatchNewInquiryAlerts } from "@/lib/inquiry-alerts";
import type { InquiryRecord } from "@/lib/inquiries";
import { parseInquiry } from "@/lib/inquiry-contract";
import { publicRateLimit } from "@/lib/public-rate-limit";
import { isSameOrigin } from "@/lib/admin-security";

export async function POST(request:NextRequest){if(!isSameOrigin(request))return Response.json({error:"Cross-origin request rejected."},{status:403});if(!await publicRateLimit(request,"inquiry",5,3600))return Response.json({error:"Too many requests. Please try again later."},{status:429});if(!isSupabaseServerConfigured())return Response.json({error:"Project inquiries are temporarily unavailable. Please contact the Studio through a configured channel."},{status:503});let body:unknown;try{body=await readJson(request)}catch{return Response.json({error:"Invalid request."},{status:400})}const inquiry=parseInquiry(body);if(!inquiry)return Response.json({error:"Please review the brief and contact details."},{status:400});const reference=`TS-${randomBytes(4).toString("hex").toUpperCase()}`;let inserted:Pick<InquiryRecord,"id"|"reference"|"created_at">;try{const rows=await supabaseRest<Array<Pick<InquiryRecord,"id"|"reference"|"created_at">>>(
  "inquiries?select=id,reference,created_at",
  {method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({email:inquiry.email,payload:inquiry,status:"new",reference})},
  true,
);if(!rows[0])throw new Error("Inquiry insert did not return a row.");inserted=rows[0]}catch{return Response.json({error:"We could not save your inquiry. Nothing was submitted; please try again."},{status:502})}try{await dispatchNewInquiryAlerts({...inserted,payload:inquiry})}catch{console.error("[studio-alerts] inquiry dispatch boundary failed",{code:"unexpected_failure"})}return Response.json({ok:true,reference})}
