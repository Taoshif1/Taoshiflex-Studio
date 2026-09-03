import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";
import { safeAdminReturnPath } from "@/lib/admin-list-state";
import type {
  AdminProjectFeedback,
  ClientProject,
  ClientProjectMember,
  ProjectDeliverable,
  ProjectFeedback,
  ProjectMilestone,
  ProjectUpdate,
} from "@/lib/client-projects";
import { AdminBreadcrumbs } from "../../admin-breadcrumbs";
import { ClientProjectEditor } from "./project-editor";
import { FeedbackAdmin } from "./feedback-admin";
import "./feedback.css";
import "./billing-admin.css";
import { BillingAdmin } from "./billing-admin";
import { DeliverableFilesAdmin } from "./deliverable-files-admin";
import type { BillingSummary, PaymentScheduleItem, ProjectBilling, ProjectPayment } from "@/lib/commercial";

export const metadata: Metadata = { title: "Client Project / Studio Admin", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ClientProjectDetailPage({ params, searchParams }: Props) {
  if (!await getAdminSession()) redirect("/studio-admin");
  const { id } = await params;
  if (!uuid.test(id)) notFound();
  const projects = await supabaseRest<ClientProject[]>(`client_projects?id=eq.${id}&select=*&limit=1`, {}, "privileged").catch(() => []);
  const project = projects[0];
  if (!project) notFound();
  const returnPath = safeAdminReturnPath((await searchParams).from, "/studio-admin/client-projects");
  const [members, milestones, updates, deliverables, feedbackRows, billingRows, summaryRows, schedule, payments] = await Promise.all([
    supabaseRest<ClientProjectMember[]>(`client_project_members?project_id=eq.${id}&select=*&order=created_at.asc`, {}, "privileged").catch(() => []),
    supabaseRest<ProjectMilestone[]>(`project_milestones?project_id=eq.${id}&select=*&order=sort_order.asc,id.asc`, {}, "privileged").catch(() => []),
    supabaseRest<ProjectUpdate[]>(`project_updates?project_id=eq.${id}&select=*&order=published_at.desc,id.desc`, {}, "privileged").catch(() => []),
    supabaseRest<ProjectDeliverable[]>(`project_deliverables?project_id=eq.${id}&select=id,project_id,title,description,status,external_url,storage_path,created_at,updated_at&order=updated_at.desc,id.desc`, {}, "privileged").catch(() => []),
    supabaseRest<ProjectFeedback[]>(`project_feedback?project_id=eq.${id}&select=id,project_id,target_type,target_id,target_label,author_user_id,intent,message,status,studio_response,responded_by,responded_at,resolved_at,created_at,updated_at&order=created_at.desc,id.desc`, {}, "privileged").catch(() => []),
    supabaseRest<ProjectBilling[]>(`project_billing?project_id=eq.${id}&select=*&limit=1`,{},"privileged").catch(()=>[]),
    supabaseRest<BillingSummary[]>(`project_billing_summaries?project_id=eq.${id}&select=*&limit=1`,{},"privileged").catch(()=>[]),
    supabaseRest<PaymentScheduleItem[]>(`project_payment_schedule?project_id=eq.${id}&select=*&order=sort_order.asc,created_at.asc`,{},"privileged").catch(()=>[]),
    supabaseRest<ProjectPayment[]>(`project_payments?project_id=eq.${id}&select=*&order=submitted_at.desc,id.desc`,{},"privileged").catch(()=>[]),
  ]);
  const memberEmail = new Map(members.map((member) => [member.user_id, member.email]));
  const feedback: AdminProjectFeedback[] = feedbackRows.map((item) => ({
    ...item,
    author_label: memberEmail.get(item.author_user_id) ?? "Client member",
  }));

  return (
    <main className="admin-shell client-project-detail">
      <AdminBreadcrumbs items={[{ label: "Studio Admin", href: "/studio-admin" }, { label: "Client Projects", href: returnPath }, { label: `${project.reference} / ${project.name}` }]}/>
      <header className="admin-head"><div><p className="eyebrow">Private / {project.reference}</p><h1>{project.name}</h1><p>Source inquiry, membership and client-visible delivery controls.</p></div><Link className="admin-back" href={returnPath}>← Back to Client Projects</Link></header>
      <BillingAdmin projectId={project.id} data={{billing:billingRows[0]??null,summary:summaryRows[0]??null,schedule,payments}}/>
      <FeedbackAdmin projectId={project.id} feedback={feedback}/>
      <DeliverableFilesAdmin projectId={project.id} deliverables={deliverables}/>
      <ClientProjectEditor project={project} members={members} milestones={milestones} updates={updates} deliverables={deliverables}/>
    </main>
  );
}
