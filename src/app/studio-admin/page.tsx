import type { Metadata } from "next";

import { normalizeClientWorkspaceMaintenance } from "@/lib/client-workspace-maintenance-contract";
import { loadAttentionNotifications } from "@/lib/notifications";
import {
  buildStudioDashboard,
  type DashboardBillingRow,
  type DashboardInquiryRow,
  type DashboardMembershipRow,
  type DashboardPaymentRow,
  type DashboardProjectRow,
} from "@/lib/studio-dashboard";
import {
  getAdminAuthorization,
  isSupabasePublicConfigured,
  isSupabaseServerConfigured,
  supabaseRest,
} from "@/lib/supabase-rest";
import { AdminLegacyHashRedirect } from "./admin-legacy-hash-redirect";
import {
  StudioConsole,
  type AdminOverviewSummary,
} from "./studio-console";
import { StudioDashboard } from "./studio-dashboard";

export const metadata: Metadata = {
  title: "Studio Admin",
  robots: { index: false, follow: false },
};

type Row = Record<string, unknown>;
type ProjectSummaryRow = { id: string; published: boolean; featured: boolean };
type PackageSummaryRow = { id: string; enabled: boolean };
type PolicySummaryRow = {
  id: string;
  archived_at: string | null;
  policy_versions?: Array<{ is_published: boolean }>;
};

export default async function StudioAdminPage() {
  const configured =
    isSupabaseServerConfigured() && isSupabasePublicConfigured();
  const authorization = configured ? await getAdminAuthorization() : null;
  const user = authorization?.user;
  if (!user || !authorization) {
    return <StudioConsole configured={configured} />;
  }

  const [
    publicProjects,
    packages,
    settings,
    policies,
    attentionRows,
    dashboardRows,
  ] = await Promise.all([
    supabaseRest<ProjectSummaryRow[]>(
      "projects?select=id,published,featured&limit=5000",
      {},
      "privileged",
    ).catch(() => []),
    supabaseRest<PackageSummaryRow[]>(
      "service_packages?select=id,enabled&limit=5000",
      {},
      "privileged",
    ).catch(() => []),
    supabaseRest<Row[]>(
      "site_settings?select=key,value,public",
      {},
      "privileged",
    ).catch(() => []),
    supabaseRest<PolicySummaryRow[]>(
      "policies?select=id,archived_at,policy_versions(is_published)&limit=5000",
      {},
      "privileged",
    ).catch(() => []),
    loadAttentionNotifications(user.id, {
      userAccessToken: authorization.token,
    }),
    Promise.all([
      supabaseRest<DashboardProjectRow[]>(
        "client_projects?select=id,status,target_date&limit=5000",
        {},
        "privileged",
      ),
      supabaseRest<DashboardMembershipRow[]>(
        "client_project_members?select=user_id,role&limit=5000",
        {},
        "privileged",
      ),
      supabaseRest<DashboardBillingRow[]>(
        "project_billing?select=project_id,agreed_value_minor,currency,currency_decimals&limit=5000",
        {},
        "privileged",
      ),
      supabaseRest<DashboardPaymentRow[]>(
        "project_payments?select=project_id,entry_type,amount_minor,currency,status,confirmed_at&limit=5000",
        {},
        "privileged",
      ),
      supabaseRest<DashboardInquiryRow[]>(
        "inquiries?select=status,created_at&limit=5000",
        {},
        "privileged",
      ),
    ]).catch(() => null),
  ]);

  const dashboard = dashboardRows
    ? buildStudioDashboard({
        clientProjects: dashboardRows[0],
        memberships: dashboardRows[1],
        billing: dashboardRows[2],
        payments: dashboardRows[3],
        inquiries: dashboardRows[4],
      })
    : null;
  const clientProjects = dashboardRows?.[0] ?? [];
  const inquiries = dashboardRows?.[4] ?? [];
  const setting = (key: string) =>
    (settings.find((item) => item.key === key)?.value ?? {}) as Row;
  const overview: AdminOverviewSummary = {
    projects: {
      total: publicProjects.length,
      featured: publicProjects.filter((item) => item.featured).length,
      published: publicProjects.filter(
        (item) => item.published && !item.featured,
      ).length,
      draft: publicProjects.filter((item) => !item.published).length,
    },
    inquiries: {
      total: inquiries.length,
      newCount: inquiries.filter((item) => item.status === "new").length,
    },
    clientProjects: {
      total: clientProjects.length,
      active: clientProjects.filter(
        (item) => !["completed", "cancelled"].includes(item.status),
      ).length,
    },
    pricing: {
      total: packages.length,
      active: packages.filter((item) => item.enabled).length,
    },
    policies: {
      total: policies.filter((item) => !item.archived_at).length,
      published: policies.filter(
        (item) =>
          !item.archived_at &&
          item.policy_versions?.some((version) => version.is_published),
      ).length,
    },
    presenceConfigured: Boolean(setting("studio_presence").email),
    alertsEnabled: setting("studio_alerts").emailEnabled === true,
    assistantEnabled: setting("assistant").enabled === true,
    maintenanceEnabled: normalizeClientWorkspaceMaintenance(
      setting("client_workspace_maintenance"),
    ).enabled,
  };
  const attention = attentionRows.map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    href: item.href,
    createdAt: item.created_at,
    type: item.type,
  }));

  return (
    <>
      <AdminLegacyHashRedirect />
      <StudioConsole
        configured={configured}
        email={user.email}
        view="overview"
        attention={attention}
        overview={overview}
        dashboard={<StudioDashboard data={dashboard} />}
      />
    </>
  );
}
