import { getClientWorkspaceMaintenance } from "@/lib/client-workspace-maintenance";
import { formatProjectDate, type ProjectFeedback, type ProjectUpdate } from "@/lib/client-projects";
import { loadClientProject } from "@/lib/client-workspace";
import { supabaseRest } from "@/lib/supabase-rest";
import { FeedbackPanel } from "../feedback-panel";
import { WorkspaceEmpty, WorkspaceSection } from "../workspace-ui";

type Props = { params: Promise<{ id: string }> };

export default async function ClientUpdatesPage({ params }: Props) {
  const { id } = await params;
  const { access } = await loadClientProject(id);
  const [updates, feedback, maintenance] = await Promise.all([
    supabaseRest<ProjectUpdate[]>(`project_updates?project_id=eq.${id}&select=*&order=published_at.desc`, {}, access).catch(() => []),
    supabaseRest<ProjectFeedback[]>(`project_feedback?project_id=eq.${id}&target_type=eq.update&select=*&order=created_at.asc,id.asc`, {}, access).catch(() => []),
    getClientWorkspaceMaintenance(),
  ]);
  return (
    <WorkspaceSection eyebrow="Studio notes" title="Updates">
      <div className="update-list">
        {updates.length ? updates.map((item) => (
          <article key={item.id}>
            <time dateTime={item.published_at}>{formatProjectDate(item.published_at)}</time>
            <h3>{item.title}</h3><p>{item.body}</p>
            <FeedbackPanel projectId={id} targetType="update" targetId={item.id} feedback={feedback.filter((entry) => entry.target_id === item.id)} readOnly={maintenance.enabled} maintenanceMessage={maintenance.message}/>
          </article>
        )) : <WorkspaceEmpty>No published updates yet.</WorkspaceEmpty>}
      </div>
    </WorkspaceSection>
  );
}
