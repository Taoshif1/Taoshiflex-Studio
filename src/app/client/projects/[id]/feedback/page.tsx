import { getClientWorkspaceMaintenance } from "@/lib/client-workspace-maintenance";
import type { ProjectFeedback } from "@/lib/client-projects";
import { loadClientProject } from "@/lib/client-workspace";
import { supabaseRest } from "@/lib/supabase-rest";
import { FeedbackPanel } from "../feedback-panel";
import { WorkspaceSection } from "../workspace-ui";

type Props = { params: Promise<{ id: string }> };

export default async function ClientFeedbackPage({ params }: Props) {
  const { id } = await params;
  const { access } = await loadClientProject(id);
  const [feedback, maintenance] = await Promise.all([
    supabaseRest<ProjectFeedback[]>(`project_feedback?project_id=eq.${id}&target_type=eq.project&target_id=is.null&select=*&order=created_at.asc,id.asc`, {}, access).catch(() => []),
    getClientWorkspaceMaintenance(),
  ]);
  return (
    <WorkspaceSection eyebrow="Project conversation" title="General feedback" helpHref="/client/help#feedback">
      <div className="feedback-general">
        <p>Ask a project-level question or leave a note that is not tied to one item.</p>
        <FeedbackPanel projectId={id} targetType="project" targetId={null} feedback={feedback} readOnly={maintenance.enabled} maintenanceMessage={maintenance.message}/>
      </div>
    </WorkspaceSection>
  );
}
