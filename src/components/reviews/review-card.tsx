import type { CSSProperties } from "react";
import type { PublicReview } from "@/types/content";
import "./reviews.css";

export function ReviewCard({ review }: { review: PublicReview }) {
  return <figure className="review-card" style={{ "--review-accent": /^#[0-9a-f]{6}$/i.test(review.accent ?? "") ? review.accent : "#b89055" } as CSSProperties}>
    {review.project_name && <small>{review.project_name}</small>}
    <p className="review-stars" aria-label={`${review.rating} out of 5 stars`}><span aria-hidden="true">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></p>
    <blockquote>“{review.review_text}”</blockquote>
    <figcaption><strong>{review.reviewer_name}</strong><span>{[review.reviewer_role, review.reviewer_company].filter(Boolean).join(" / ")}</span></figcaption>
  </figure>;
}
