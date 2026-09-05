import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";
import { StudioConsole } from "../../studio-console";

export const metadata: Metadata = { title: "Client Workspace Maintenance / Studio Admin", robots: { index: false, follow: false } };

export default async function AdminMaintenancePage() {
  const user = await getAdminSession();
  if (!user) redirect("/studio-admin");
  const settings = await supabaseRest<Array<Record<string, unknown>>>(
    "site_settings?key=eq.client_workspace_maintenance&select=key,value,public&limit=1",
    {},
    "privileged",
  ).catch(() => []);
  return <StudioConsole configured email={user.email} view="maintenance" settings={settings}/>;
}
