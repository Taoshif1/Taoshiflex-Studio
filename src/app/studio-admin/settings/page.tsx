import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { normalizeClientWorkspaceMaintenance } from "@/lib/client-workspace-maintenance-contract";
import { getGeminiReadiness } from "@/lib/gemini-studio-assistant";
import { getStudioAlertReadiness } from "@/lib/inquiry-alerts";
import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";

export const metadata: Metadata = {
  title: "Settings / Studio Admin",
  robots: { index: false, follow: false },
};
type Row = { key: string; value?: Record<string, unknown> };

export default async function AdminSettingsPage() {
  if (!await getAdminSession()) redirect("/studio-admin");
  const settings = await supabaseRest<Row[]>(
    "site_settings?select=key,value,public",
    {},
    "privileged",
  ).catch(() => []);
  const value = (key: string) =>
    settings.find((item) => item.key === key)?.value ?? {};
  const readiness = getGeminiReadiness();
  const alerts = getStudioAlertReadiness();
  const maintenance = normalizeClientWorkspaceMaintenance(
    value("client_workspace_maintenance"),
  );
  const cards = [
    {
      title: "Studio Presence",
      summary: value("studio_presence").email ? "Configured" : "Review public contact details",
      href: "/studio-admin/settings/presence",
    },
    {
      title: "Inquiry Alerts",
      summary: alerts.email ? "Email provider configured" : "SMTP provider not configured",
      href: "/studio-admin/settings/alerts",
    },
    {
      title: "Studio Assistant",
      summary: readiness.configured ? "AI provider configured" : "Rule-based fallback active",
      href: "/studio-admin/settings/assistant",
    },
    {
      title: "Client Workspace Maintenance",
      summary: maintenance.enabled ? "Read-only maintenance" : "Normal",
      href: "/studio-admin/settings/maintenance",
    },
  ];
  return <main className="admin-shell settings-hub">
    <header className="admin-head"><div><p className="eyebrow">Private / Configuration</p><h1>Settings</h1><p>Focused controls for public presence, operations, guidance, and Client access.</p></div></header>
    <section className="admin-overview"><div className="admin-overview-grid">{cards.map((card)=><article key={card.href}><h2>{card.title}</h2><p>{card.summary}</p><Link href={card.href}>Open settings</Link></article>)}</div></section>
  </main>;
}
