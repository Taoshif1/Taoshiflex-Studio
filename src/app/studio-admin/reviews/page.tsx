import { redirect } from "next/navigation";
import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";
import { ReviewsAdmin, type AdminReview } from "./reviews-admin";

export default async function ReviewsPage() {
  if (!await getAdminSession()) redirect("/studio-admin");
  const [reviews, projects] = await Promise.all([
    supabaseRest<AdminReview[]>("project_reviews?select=id,reviewer_name,reviewer_company,rating,review_text,submitted_at,published,featured,sort_order,moderation_note,public_project_id,client_projects(name)&order=submitted_at.desc", {}, "privileged").catch(() => null),
    supabaseRest<Array<{ id: string; name: string }>>("projects?select=id,name&order=name.asc", {}, "privileged").catch(() => []),
  ]);
  return <section className="admin-shell"><header><p className="eyebrow">Studio Console / Reviews</p><h1>Client perspectives</h1><p>Moderate visibility while preserving every client’s original words.</p></header>{reviews === null ? <p>Reviews are unavailable. Verify the review migration is applied.</p> : <ReviewsAdmin reviews={reviews} projects={projects}/>}</section>;
}
