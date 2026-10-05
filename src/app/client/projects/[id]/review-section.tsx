import { loadClientProject } from "@/lib/client-workspace";
import { supabaseRest } from "@/lib/supabase-rest";
import { canSubmitProjectReview } from "@/lib/review-selection";
import { getClientWorkspaceMaintenance } from "@/lib/client-workspace-maintenance";
import { ReviewForm } from "./review-form";

export async function ClientReviewSection({ projectId }: { projectId: string }) {
  const { project, access, authorization } = await loadClientProject(projectId);
  const [reviews, members, maintenance] = await Promise.all([
    supabaseRest<Array<{ rating: number; review_text: string; published: boolean }>>(`project_reviews?client_project_id=eq.${projectId}&reviewer_user_id=eq.${authorization.user.id}&select=rating,review_text,published&limit=1`, {}, access).catch(() => null),
    supabaseRest<Array<{ role: string }>>(`client_project_members?project_id=eq.${projectId}&user_id=eq.${authorization.user.id}&role=eq.client&select=role`, {}, access).catch(() => null),
    getClientWorkspaceMaintenance(),
  ]);
  const eligible = canSubmitProjectReview(members?.[0]?.role, project.status);
  return <section className="client-review-section" aria-labelledby="review-title"><p className="eyebrow">Client perspective</p><h2 id="review-title">Share your experience</h2>
    {reviews === null || members === null ? <p>Reviews are temporarily unavailable. Please try again later.</p> : reviews[0] ? <><p>{reviews[0].rating} out of 5 stars · {reviews[0].published ? "Published" : "Submitted for moderation"}</p><blockquote>{reviews[0].review_text}</blockquote><p>Thank you for sharing your experience. Contact Studio if you need a correction.</p></> : !members.length ? <p>Reviews can be submitted by the project’s Client members.</p> : !eligible ? <p className="workspace-empty">Review available after project completion.</p> : maintenance.enabled ? <p>{maintenance.message || "Review submissions are temporarily paused."}</p> : <ReviewForm projectId={projectId}/>}
  </section>;
}
