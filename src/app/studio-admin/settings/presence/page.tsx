import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";
import { StudioConsole } from "../../studio-console";

export const metadata: Metadata = { title: "Studio Presence / Studio Admin", robots: { index: false, follow: false } };

export default async function AdminPresencePage() {
  const user = await getAdminSession();
  if (!user) redirect("/studio-admin");
  const settings = await supabaseRest<Array<Record<string, unknown>>>(
    "site_settings?key=eq.studio_presence&select=key,value,public&limit=1",
    {},
    "privileged",
  ).catch(() => []);
  return <StudioConsole configured email={user.email} view="presence" settings={settings}/>;
}
