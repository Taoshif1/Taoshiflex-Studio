import { ProjectTimeline } from "@/components/projects/project-timeline";
import type {
  ProjectDeliverable,
  ProjectFeedback,
  ProjectMilestone,
  ProjectUpdate,
} from "@/lib/client-projects";
import { clientProjectHref, loadClientProject } from "@/lib/client-workspace";
import type { ProjectBilling, ProjectPayment } from "@/lib/commercial";
import { buildProjectTimeline } from "@/lib/project-timeline";
import { supabaseRest } from "@/lib/supabase-rest";

type Props = { params: Promise<{ id: string }> };

export default async function ClientTimelinePage({ params }: Props) {
  const { id } = await params;
  const { access } = await loadClientProject(id);
  const [milestones, updates, deliverables, feedback, billing, payments] = await Promise.all([
    supabaseRest<ProjectMilestone[]>(`project_milestones?project_id=eq.${id}&select=*&order=sort_order.asc`, {}, access).catch(() => []),
    supabaseRest<ProjectUpdate[]>(`project_updates?project_id=eq.${id}&select=*&order=published_at.desc`, {}, access).catch(() => []),
    supabaseRest<ProjectDeliverable[]>(`project_deliverables?project_id=eq.${id}&select=*&order=updated_at.desc`, {}, access).catch(() => []),
    supabaseRest<ProjectFeedback[]>(`project_feedback?project_id=eq.${id}&select=*&order=created_at.asc,id.asc`, {}, access).catch(() => []),
    supabaseRest<ProjectBilling[]>(`project_billing?project_id=eq.${id}&select=*&limit=1`, {}, access).catch(() => []),
    supabaseRest<ProjectPayment[]>(`project_payments?project_id=eq.${id}&select=*&order=submitted_at.desc,id.desc`, {}, access).catch(() => []),
  ]);
  const routes: Record<string, string> = {
    "#updates": "updates",
    "#milestones": "milestones",
    "#deliverables": "deliverables",
    "#billing": "billing",
    "#feedback": "feedback",
  };
  const events = buildProjectTimeline({
    milestones,
    updates,
    deliverables,
    feedback,
    payments,
    billing: billing[0] ?? null,
  }).map((event) => ({
    ...event,
    href: event.href && routes[event.href] ? clientProjectHref(id, routes[event.href]) : event.href,
  }));
  return <ProjectTimeline events={events} helpHref="/client/help#timeline"/>;
}
