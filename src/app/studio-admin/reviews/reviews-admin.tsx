"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ToastRegion, useToasts } from "@/components/ui/toast";
import "@/components/reviews/reviews.css";

export type AdminReview = { id: string; reviewer_name: string; reviewer_company: string; rating: number; review_text: string; submitted_at: string; published: boolean; featured: boolean; sort_order: number; moderation_note: string; public_project_id: string | null; client_projects: { name: string } | null };
export function ReviewsAdmin({ reviews, projects }: { reviews: AdminReview[]; projects: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const { toasts, toast, dismiss } = useToasts();
  async function save(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget); setBusy(id);
    try {
      const response = await fetch("/api/studio/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, published: data.has("published"), featured: data.has("featured"), public_project_id: data.get("public_project_id") || null, sort_order: Number(data.get("sort_order")), moderation_note: data.get("moderation_note") }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      toast("success", "Review visibility saved. Public pages refresh within a minute."); router.refresh();
    } catch (error) { toast("error", error instanceof Error ? error.message : "Could not save review."); }
    finally { setBusy(null); }
  }
  const visible = reviews.filter(review => (filter === "all" || (filter === "pending" ? !review.published : filter === "featured" ? review.featured : review.published)) && `${review.reviewer_name} ${review.reviewer_company} ${review.client_projects?.name} ${review.review_text}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="review-admin"><p>{reviews.length} total · {reviews.filter(r => !r.published).length} unpublished · {reviews.filter(r => r.featured).length} featured</p>
    <div className="review-admin-controls"><label>Search reviews<input type="search" value={search} onChange={e => setSearch(e.target.value)}/></label><label>Visibility<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All</option><option value="pending">Unpublished</option><option value="published">Published</option><option value="featured">Featured</option></select></label></div>
    {!visible.length && <p>No reviews match this view.</p>}
    {visible.map(review => <article key={review.id}><header><h2>{review.client_projects?.name ?? "Client project"}</h2><p>{review.reviewer_name}{review.reviewer_company && ` / ${review.reviewer_company}`} · {review.rating}/5 · <time dateTime={review.submitted_at}>{review.submitted_at.slice(0, 10)}</time></p><p>{review.published ? "Published" : "Unpublished"}{review.featured ? " / Featured" : ""}</p></header><blockquote>{review.review_text}</blockquote>
      <form onSubmit={event => save(event, review.id)}><div className="review-admin-controls"><label className="review-toggle"><input type="checkbox" name="published" defaultChecked={review.published}/>Published</label><label className="review-toggle"><input type="checkbox" name="featured" defaultChecked={review.featured}/>Featured on homepage</label><label>Public case study<select name="public_project_id" defaultValue={review.public_project_id ?? ""}><option value="">No case-study mapping</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>Display order<input type="number" name="sort_order" min={-100000} max={100000} defaultValue={review.sort_order}/></label></div><label>Private moderation note<textarea name="moderation_note" maxLength={2000} defaultValue={review.moderation_note}/></label><button className="action" disabled={busy !== null}>{busy === review.id ? "Saving…" : "Save moderation"}</button></form>
    </article>)}<ToastRegion toasts={toasts} dismiss={dismiss}/>
  </div>;
}
