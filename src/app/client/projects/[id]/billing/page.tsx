import { getClientWorkspaceMaintenance } from "@/lib/client-workspace-maintenance";
import { loadClientProject } from "@/lib/client-workspace";
import type { BillingSummary, PaymentScheduleItem, ProjectBilling, ProjectPayment } from "@/lib/commercial";
import { supabaseRest } from "@/lib/supabase-rest";
import { BillingPanel } from "../billing-panel";
import { WorkspaceSection } from "../workspace-ui";

type Props = { params: Promise<{ id: string }> };

export default async function ClientBillingPage({ params }: Props) {
  const { id } = await params;
  const { access } = await loadClientProject(id);
  const [billing, summaries, schedule, payments, maintenance] = await Promise.all([
    supabaseRest<ProjectBilling[]>(`project_billing?project_id=eq.${id}&select=*&limit=1`, {}, access).catch(() => []),
    supabaseRest<BillingSummary[]>(`project_billing_summaries?project_id=eq.${id}&select=*&limit=1`, {}, access).catch(() => []),
    supabaseRest<PaymentScheduleItem[]>(`project_payment_schedule?project_id=eq.${id}&select=*&order=sort_order.asc,created_at.asc`, {}, access).catch(() => []),
    supabaseRest<ProjectPayment[]>(`project_payments?project_id=eq.${id}&select=*&order=submitted_at.desc,id.desc`, {}, access).catch(() => []),
    getClientWorkspaceMaintenance(),
  ]);
  return (
    <WorkspaceSection eyebrow="Commercial summary" title="Billing / Payments" helpHref="/client/help#billing-payments">
      <BillingPanel projectId={id} data={{ billing: billing[0] ?? null, summary: summaries[0] ?? null, schedule, payments }} readOnly={maintenance.enabled} maintenanceMessage={maintenance.message}/>
    </WorkspaceSection>
  );
}
