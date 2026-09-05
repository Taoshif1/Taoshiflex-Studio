import { getClientWorkspaceMaintenance } from "@/lib/client-workspace-maintenance";
import {
  formatProjectDate,
  statusLabel,
  type FeedbackTargetType,
  type ProjectFeedback,
  type ProjectMilestone,
} from "@/lib/client-projects";
import { loadClientProject } from "@/lib/client-workspace";
import { supabaseRest } from "@/lib/supabase-rest";
import { FeedbackPanel } from "../feedback-panel";
import { WorkspaceEmpty, WorkspaceSection } from "../workspace-ui";

type Props = { params: Promise<{ id: string }> };

export default async function ClientMilestonesPage({ params }: Props) {
  const { id } = await params;
  const { access } = await loadClientProject(id);
  const [milestones, feedback, maintenance] = await Promise.all([
    supabaseRest<ProjectMilestone[]>(`project_milestones?project_id=eq.${id}&select=*&order=sort_order.asc`, {}, access).catch(() => []),
    supabaseRest<ProjectFeedback[]>(`project_feedback?project_id=eq.${id}&target_type=eq.milestone&select=*&order=created_at.asc,id.asc`, {}, access).catch(() => []),
    getClientWorkspaceMaintenance(),
  ]);
  const forTarget = (targetType: FeedbackTargetType, targetId: string) =>
    feedback.filter((item) => item.target_type === targetType && item.target_id === targetId);
  const current = milestones.filter((item) => item.status !== "completed" && !item.archived_at);
  const previous = milestones.filter((item) => item.status === "completed" || Boolean(item.archived_at));
  const card = (item: ProjectMilestone) => (
    <article key={item.id}>
      <span className={`client-status ${item.status}`}>{statusLabel(item.status)}</span>
      <div>
        <h3>{item.title}</h3>
        {item.description ? <p>{item.description}</p> : null}
        <FeedbackPanel projectId={id} targetType="milestone" targetId={item.id} feedback={forTarget("milestone", item.id)} readOnly={maintenance.enabled} maintenanceMessage={maintenance.message}/>
      </div>
      <dl><dt>Due</dt><dd>{formatProjectDate(item.due_date)}</dd>{item.completed_at ? <><dt>Completed</dt><dd>{formatProjectDate(item.completed_at)}</dd></> : null}</dl>
    </article>
  );
  return (
    <WorkspaceSection eyebrow="Plan" title="Milestones">
      <h3 className="milestone-group-title">Current milestones</h3>
      <div className="milestone-list">{current.length ? current.map(card) : <WorkspaceEmpty>No current milestones.</WorkspaceEmpty>}</div>
      {previous.length ? <details className="milestone-history" open><summary>Completed / Previous milestones ({previous.length})</summary><div className="milestone-list">{previous.map(card)}</div></details> : null}
    </WorkspaceSection>
  );
}
