import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getStudioAlertReadiness } from "@/lib/inquiry-alerts";
import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";
import { StudioConsole } from "../../studio-console";

export const metadata: Metadata = { title: "Inquiry Alerts / Studio Admin", robots: { index: false, follow: false } };

export default async function AdminAlertsPage() {
  const user = await getAdminSession();
  if (!user) redirect("/studio-admin");
  const settings = await supabaseRest<Array<Record<string, unknown>>>(
    "site_settings?key=eq.studio_alerts&select=key,value,public&limit=1",
    {},
    "privileged",
  ).catch(() => []);
  return <StudioConsole configured email={user.email} view="alerts" settings={settings} alertReadiness={getStudioAlertReadiness()}/>;
}
