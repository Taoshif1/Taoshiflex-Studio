import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getClientAuthorization } from "@/lib/client-auth";
import {
  formatProjectDate,
  statusLabel,
  type ClientProject,
  type FeedbackTargetType,
  type ProjectDeliverable,
  type ProjectFeedback,
  type ProjectMilestone,
  type ProjectUpdate,
} from "@/lib/client-projects";
import { supabaseRest } from "@/lib/supabase-rest";
import { FeedbackPanel } from "./feedback-panel";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { loadNotificationInbox } from "@/lib/notifications";
import "./feedback.css";
import { BillingPanel } from "./billing-panel";
import { DeliverableActions } from "./deliverable-actions";
import type { BillingSummary, PaymentScheduleItem, ProjectBilling, ProjectPayment } from "@/lib/commercial";
import { buildProjectTimeline } from "@/lib/project-timeline";
import { ProjectTimeline } from "@/components/projects/project-timeline";
import { deriveClientNextAction } from "@/lib/client-next-action";

type Props = { params: Promise<{ id: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ClientProjectPage({ params }: Props) {
  const authorization = await getClientAuthorization();
  if (!authorization) redirect("/client");
  const { id } = await params;
  if (!uuid.test(id)) notFound();

  const access = { userAccessToken: authorization.token };
  const projects = await supabaseRest<ClientProject[]>(
    `client_projects?id=eq.${encodeURIComponent(id)}&select=id,reference,name,client_name,summary,status,progress,current_phase,next_action,start_date,target_date,created_at,updated_at&limit=1`,
    {},
    access,
  ).catch(() => null);
  if (projects === null) return <Unavailable/>;
  const project = projects[0];
  if (!project) notFound();

  const [milestones, updates, deliverables, feedback, inbox, billingRows, summaryRows, schedule, payments] = await Promise.all([
    supabaseRest<ProjectMilestone[]>(`project_milestones?project_id=eq.${id}&select=*&order=sort_order.asc`, {}, access).catch(() => []),
    supabaseRest<ProjectUpdate[]>(`project_updates?project_id=eq.${id}&select=id,project_id,title,body,published_at,created_at,updated_at&order=published_at.desc`, {}, access).catch(() => []),
    supabaseRest<ProjectDeliverable[]>(`project_deliverables?project_id=eq.${id}&select=id,project_id,title,description,status,external_url,storage_path,created_at,updated_at&order=updated_at.desc`, {}, access).catch(() => []),
    supabaseRest<ProjectFeedback[]>(`project_feedback?project_id=eq.${id}&select=id,project_id,target_type,target_id,target_label,author_user_id,intent,message,status,studio_response,responded_by,responded_at,resolved_at,created_at,updated_at&order=created_at.asc,id.asc`, {}, access).catch(() => []),
    loadNotificationInbox(authorization.user.id, access),
    supabaseRest<ProjectBilling[]>(`project_billing?project_id=eq.${id}&select=*&limit=1`,{},access).catch(()=>[]),
    supabaseRest<BillingSummary[]>(`project_billing_summaries?project_id=eq.${id}&select=*&limit=1`,{},access).catch(()=>[]),
    supabaseRest<PaymentScheduleItem[]>(`project_payment_schedule?project_id=eq.${id}&select=*&order=sort_order.asc,created_at.asc`,{},access).catch(()=>[]),
    supabaseRest<ProjectPayment[]>(`project_payments?project_id=eq.${id}&select=*&order=submitted_at.desc,id.desc`,{},access).catch(()=>[]),
  ]);
  const forTarget = (targetType: FeedbackTargetType, targetId: string | null) =>
    feedback.filter((item) => item.target_type === targetType && item.target_id === targetId);
  const currentMilestones=milestones.filter(item=>item.status!=="completed"&&!item.archived_at);
  const previousMilestones=milestones.filter(item=>item.status==="completed"||Boolean(item.archived_at));
  const timeline = buildProjectTimeline({ milestones, updates, deliverables, feedback, payments, billing: billingRows[0] ?? null });
  const nextAction = deriveClientNextAction({ project, deliverables, feedback });
  const milestoneCard=(item:ProjectMilestone)=><article key={item.id}>
    <span className={`client-status ${item.status}`}>{statusLabel(item.status)}</span>
    <div><h3>{item.title}</h3>{item.description ? <p>{item.description}</p> : null}<FeedbackPanel projectId={id} targetType="milestone" targetId={item.id} feedback={forTarget("milestone", item.id)}/></div>
    <dl><dt>Due</dt><dd>{formatProjectDate(item.due_date)}</dd>{item.completed_at ? <><dt>Completed</dt><dd>{formatProjectDate(item.completed_at)}</dd></> : null}</dl>
  </article>;

  return (
    <main className="client-shell project-workspace">
      <header className="workspace-head">
        <Link href="/client">← All projects</Link>
        <div><p className="eyebrow">{project.reference} / Client Project</p><h1>{project.name}</h1><p>{project.summary}</p></div>
        <div className="workspace-head-actions"><Link className="action" href="/client/help">Help</Link><NotificationCenter inbox={inbox}/><span className={`client-status ${project.status}`}>{statusLabel(project.status)}</span></div>
      </header>
      <section className={`client-next-action${nextAction.required ? " required" : ""}`} aria-labelledby="next-action-title">
        <div><p className="eyebrow">Your Next Action</p><h2 id="next-action-title">{nextAction.title}</h2><p>{nextAction.description}</p></div>
        {nextAction.href && nextAction.cta ? <Link className="action" href={nextAction.href}>{nextAction.cta}<span aria-hidden>↘</span></Link> : <span className="next-action-neutral">Studio monitoring</span>}
      </section>
      <section id="overview" className="project-overview" aria-labelledby="overview-title">
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
      <ProjectTimeline events={timeline} helpHref="/client/help#timeline"/>
      <nav id="project-navigation" className="project-jump-links" aria-label="Project overview navigation"><span>Project overview</span><Link href="#activity">Timeline</Link><Link href="#milestones">Milestones</Link><Link href="#updates">Updates</Link><Link href="#deliverables">Deliverables</Link><Link href="#billing">Billing</Link><Link href="#feedback">Feedback</Link></nav>
      <WorkspaceSection id="milestones" eyebrow="Plan" title="Milestones">
        <h3 className="milestone-group-title">Current milestones</h3><div className="milestone-list">{currentMilestones.length?currentMilestones.map(milestoneCard):<Empty copy="No current milestones."/>}</div>
        {previousMilestones.length?<details className="milestone-history" open><summary>Completed / Previous milestones ({previousMilestones.length})</summary><div className="milestone-list">{previousMilestones.map(milestoneCard)}</div></details>:null}
      </WorkspaceSection>
      <WorkspaceSection id="updates" eyebrow="Studio notes" title="Updates">
        <div className="update-list">
          {updates.length ? updates.map((item) => (
            <article key={item.id}><time dateTime={item.published_at}>{formatProjectDate(item.published_at)}</time><h3>{item.title}</h3><p>{item.body}</p><FeedbackPanel projectId={id} targetType="update" targetId={item.id} feedback={forTarget("update", item.id)}/></article>
          )) : <Empty copy="No published updates yet."/>}
        </div>
      </WorkspaceSection>
      <WorkspaceSection id="deliverables" eyebrow="Review and handoff" title="Deliverables" helpHref="/client/help#deliverables">
        <div className="deliverable-list">
          {deliverables.length ? deliverables.map((item) => (
            <article key={item.id}>
              <div><span className={`client-status ${item.status}`}>{statusLabel(item.status)}</span><h3>{item.title}</h3><p>{item.description}</p><FeedbackPanel projectId={id} targetType="deliverable" targetId={item.id} feedback={forTarget("deliverable", item.id)}/></div>
              <DeliverableActions deliverable={item}/>
            </article>
          )) : <Empty copy="Deliverables will appear here when they are ready for review."/>}
        </div>
      </WorkspaceSection>
      <WorkspaceSection id="billing" eyebrow="Commercial summary" title="Billing / Payments" helpHref="/client/help#billing-payments">
        <BillingPanel projectId={id} data={{billing:billingRows[0]??null,summary:summaryRows[0]??null,schedule,payments}}/>
      </WorkspaceSection>
      <WorkspaceSection id="feedback" eyebrow="Project conversation" title="General feedback" helpHref="/client/help#feedback">
        <div className="feedback-general"><p>Ask a project-level question or leave a note that is not tied to one item.</p><FeedbackPanel projectId={id} targetType="project" targetId={null} feedback={forTarget("project", null)}/></div>
      </WorkspaceSection>
    </main>
  );
}

function Overview({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function WorkspaceSection({ id, eyebrow, title, helpHref, children }: { id: string; eyebrow: string; title: string; helpHref?: string; children: React.ReactNode }) { return <section id={id} className="workspace-section"><header><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{helpHref?<Link className="workspace-help-link" href={helpHref}>How does this work?</Link>:null}</header>{children}</section>; }
function Empty({ copy }: { copy: string }) { return <p className="workspace-empty">{copy}</p>; }
function Unavailable() { return <main className="client-shell client-login"><section className="client-login-panel"><p className="eyebrow">Private / Client Workspace</p><h1>Workspace setup pending.</h1><p>This Client Project is not available yet. No private data was exposed.</p><Link className="action" href="/client">Return to Client access</Link></section></main>; }
