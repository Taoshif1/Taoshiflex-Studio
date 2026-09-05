import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-config";
import { getGeminiReadiness } from "@/lib/gemini-studio-assistant";
import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";
import { StudioConsole } from "../../studio-console";

export const metadata: Metadata = { title: "Studio Assistant / Studio Admin", robots: { index: false, follow: false } };

export default async function AdminAssistantPage() {
  const user = await getAdminSession();
  if (!user) redirect("/studio-admin");
  const settings = await supabaseRest<Array<Record<string, unknown>>>(
    "site_settings?key=eq.assistant&select=key,value,public&limit=1",
    {},
    "privileged",
  ).catch(() => []);
  return <StudioConsole configured email={user.email} view="assistant" settings={settings} aiReadiness={getGeminiReadiness() ?? {configured:false,model:DEFAULT_GEMINI_MODEL}}/>;
}
