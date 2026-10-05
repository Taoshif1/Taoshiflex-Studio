// Input must come from published_project_reviews, the constrained public projection.
// Preserve database sort_order/id ordering for equal editorial priority and rating.
export function selectHomepageReviews<T extends { featured: boolean; rating: number }>(publishedReviews: readonly T[], limit = 8): T[] {
  return [...publishedReviews].sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating).slice(0, limit);
}

export function canSubmitProjectReview(role: string | undefined, status: string) {
  return role === "client" && status === "completed";
}
