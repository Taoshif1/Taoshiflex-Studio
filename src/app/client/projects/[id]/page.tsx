import Link from "next/link";

import { deriveClientNextAction } from "@/lib/client-next-action";
import {
  formatProjectDate,
  statusLabel,
  type ProjectDeliverable,
  type ProjectFeedback,
  type ProjectMilestone,
  type ProjectUpdate,
} from "@/lib/client-projects";
import { clientProjectHref, loadClientProject } from "@/lib/client-workspace";
import { formatMoney, type BillingSummary, type ProjectPayment } from "@/lib/commercial";
import { supabaseRest } from "@/lib/supabase-rest";

type Props = { params: Promise<{ id: string }> };

export default async function ClientProjectOverviewPage({ params }: Props) {
  const { id } = await params;
  const { access, project } = await loadClientProject(id);
  const [milestones, updates, deliverables, feedback, summaries, payments] = await Promise.all([
    supabaseRest<ProjectMilestone[]>(`project_milestones?project_id=eq.${id}&select=id,status,due_date,completed_at,archived_at,updated_at&order=sort_order.asc`, {}, access).catch(() => []),
    supabaseRest<ProjectUpdate[]>(`project_updates?project_id=eq.${id}&select=id,title,published_at&order=published_at.desc`, {}, access).catch(() => []),
    supabaseRest<ProjectDeliverable[]>(`project_deliverables?project_id=eq.${id}&select=id,title,status,created_at,updated_at&order=updated_at.desc`, {}, access).catch(() => []),
    supabaseRest<ProjectFeedback[]>(`project_feedback?project_id=eq.${id}&select=id,target_type,target_id,intent,status,created_at&order=created_at.desc`, {}, access).catch(() => []),
    supabaseRest<BillingSummary[]>(`project_billing_summaries?project_id=eq.${id}&select=*&limit=1`, {}, access).catch(() => []),
    supabaseRest<ProjectPayment[]>(`project_payments?project_id=eq.${id}&select=id,status,submitted_at&order=submitted_at.desc,id.desc`, {}, access).catch(() => []),
  ]);
  const nextAction = deriveClientNextAction({ project, deliverables, feedback });
  const completedMilestones = milestones.filter((item) => item.status === "completed").length;
  const reviewDeliverables = deliverables.filter((item) => item.status === "ready_for_review").length;
  const openFeedback = feedback.filter((item) => item.status === "open").length;
  const pendingPayments = payments.filter((item) => item.status === "pending").length;
  const billing = summaries[0];
  const nextHref = nextAction.href === "#deliverables"
    ? clientProjectHref(id, "deliverables")
    : nextAction.href
      ? clientProjectHref(id)
      : undefined;

  return (
    <>
      <section className={`client-next-action${nextAction.required ? " required" : ""}`} aria-labelledby="next-action-title">
        <div><p className="eyebrow">Your Next Action</p><h2 id="next-action-title">{nextAction.title}</h2><p>{nextAction.description}</p></div>
        {nextHref && nextAction.cta ? <Link className="action" href={nextHref}>{nextAction.cta}</Link> : <span className="next-action-neutral">Studio monitoring</span>}
      </section>
      <section className="project-overview" aria-labelledby="overview-title">
        <div><p className="eyebrow">Project overview</p><h2 id="overview-title">Clarity at a glance.</h2></div>
        <dl>
          <Overview label="Status" value={statusLabel(project.status)}/>
          <Overview label="Current phase" value={project.current_phase}/>
          <Overview label="Target date" value={formatProjectDate(project.target_date)}/>
        </dl>
        <div className="workspace-progress">
          <div><span>Overall progress</span><strong>{project.progress}%</strong></div>
          <div className="client-progress" role="progressbar" aria-label="Overall project progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={project.progress}><i style={{ width: `${project.progress}%` }}/></div>
          <small>Progress is set deliberately by the Studio; it is not an automated estimate.</small>
        </div>
      </section>
      <section className="workspace-overview" aria-labelledby="workspace-sections-title">
        <header><p className="eyebrow">Project workspace</p><h2 id="workspace-sections-title">Open the detail you need.</h2></header>
        <div className="workspace-overview-grid">
          <OverviewCard href={clientProjectHref(id, "timeline")} title="Timeline" value={updates[0]?.title ?? "No activity posted yet"} detail={updates[0] ? formatProjectDate(updates[0].published_at) : "Chronological project history"}/>
          <OverviewCard href={clientProjectHref(id, "milestones")} title="Milestones" value={`${completedMilestones} of ${milestones.length} completed`} detail="Current and previous milestones"/>
          <OverviewCard href={clientProjectHref(id, "updates")} title="Updates" value={updates[0]?.title ?? "No updates yet"} detail={updates[0] ? formatProjectDate(updates[0].published_at) : "Studio project notes"}/>
          <OverviewCard href={clientProjectHref(id, "deliverables")} title="Deliverables" value={`${deliverables.length} total / ${reviewDeliverables} ready for review`} detail="Review, feedback and downloads"/>
          <OverviewCard href={clientProjectHref(id, "billing")} title="Billing / Payments" value={billing ? `${formatMoney(billing.remaining_minor, billing.currency, billing.currency_decimals)} remaining` : "Not configured yet"} detail={pendingPayments ? `${pendingPayments} payment awaiting confirmation` : "Commercial summary and history"}/>
          <OverviewCard href={clientProjectHref(id, "feedback")} title="Feedback" value={`${openFeedback} open / ${feedback.length} total`} detail="Project-level conversation"/>
        </div>
      </section>
    </>
  );
}

function Overview({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function OverviewCard({ href, title, value, detail }: { href: string; title: string; value: string; detail: string }) {
  return <article><p className="eyebrow">{title}</p><h3>{value}</h3><p>{detail}</p><Link href={href}>Open {title}</Link></article>;
}
