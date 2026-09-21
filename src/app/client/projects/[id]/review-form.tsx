"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import "@/components/reviews/reviews.css";

export function ReviewForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/client/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, reviewer_name: data.get("reviewer_name"), reviewer_role: data.get("reviewer_role"), reviewer_company: data.get("reviewer_company"), rating: Number(data.get("rating")), review_text: data.get("review_text") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      setSent(true); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }
  if (sent) return <p role="status">Thank you. Your review has been submitted for Studio moderation. Contact Studio if you need a correction.</p>;
  return <form className="review-form" onSubmit={submit}>
    <p>Your honest perspective matters. Studio may publish your review, name and optional role/company on the public website. Reviews are locked after submission.</p>
    <fieldset><legend>Your rating</legend><div className="review-rating">{[1, 2, 3, 4, 5].map(value => <label key={value}><input required type="radio" name="rating" value={value} aria-label={`${value} out of 5 stars`}/><span aria-hidden="true">{value} ★</span></label>)}</div></fieldset>
    <label>Your name<input name="reviewer_name" autoComplete="name" required minLength={2} maxLength={100}/></label>
    <div className="review-form-pair"><label>Role (optional)<input name="reviewer_role" maxLength={100}/></label><label>Company (optional)<input name="reviewer_company" autoComplete="organization" maxLength={120}/></label></div>
    <label>Your experience<textarea name="review_text" required minLength={20} maxLength={1500} rows={5} placeholder="What was it like working with the Studio?"/></label>
    <small>20–1,500 characters. Please keep private project details out of your review.</small>
    {error && <p role="alert">{error}</p>}
    <button className="action" disabled={busy}>{busy ? "Submitting…" : "Submit review"}</button>
  </form>;
}
