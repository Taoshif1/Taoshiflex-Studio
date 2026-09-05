import { getClientWorkspaceMaintenance } from "@/lib/client-workspace-maintenance";
import { statusLabel, type ProjectDeliverable, type ProjectFeedback } from "@/lib/client-projects";
import { loadClientProject } from "@/lib/client-workspace";
import { supabaseRest } from "@/lib/supabase-rest";
import { DeliverableActions } from "../deliverable-actions";
import { FeedbackPanel } from "../feedback-panel";
import { WorkspaceEmpty, WorkspaceSection } from "../workspace-ui";

type Props = { params: Promise<{ id: string }> };

export default async function ClientDeliverablesPage({ params }: Props) {
  const { id } = await params;
  const { access } = await loadClientProject(id);
  const [deliverables, feedback, maintenance] = await Promise.all([
    supabaseRest<ProjectDeliverable[]>(`project_deliverables?project_id=eq.${id}&select=*&order=updated_at.desc`, {}, access).catch(() => []),
    supabaseRest<ProjectFeedback[]>(`project_feedback?project_id=eq.${id}&target_type=eq.deliverable&select=*&order=created_at.asc,id.asc`, {}, access).catch(() => []),
    getClientWorkspaceMaintenance(),
  ]);
  return (
    <WorkspaceSection eyebrow="Review and handoff" title="Deliverables" helpHref="/client/help#deliverables">
      <div className="deliverable-list">
        {deliverables.length ? deliverables.map((item) => (
          <article key={item.id}>
            <div>
              <span className={`client-status ${item.status}`}>{statusLabel(item.status)}</span>
              <h3>{item.title}</h3><p>{item.description}</p>
              <FeedbackPanel projectId={id} targetType="deliverable" targetId={item.id} feedback={feedback.filter((entry) => entry.target_id === item.id)} readOnly={maintenance.enabled} maintenanceMessage={maintenance.message}/>
            </div>
            <DeliverableActions deliverable={item}/>
          </article>
        )) : <WorkspaceEmpty>Deliverables will appear here when they are ready for review.</WorkspaceEmpty>}
      </div>
    </WorkspaceSection>
  );
}
