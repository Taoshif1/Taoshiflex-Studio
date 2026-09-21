export const reviewUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseReview(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const keys = ["projectId", "reviewer_name", "reviewer_role", "reviewer_company", "rating", "review_text"];
  if (Object.keys(row).some(key => !keys.includes(key))) return null;
  const text = (key: string, min: number, max: number) => {
    const value = row[key] ?? "";
    return typeof value === "string" && value.trim().length >= min && value.trim().length <= max ? value.trim() : null;
  };
  const projectId = text("projectId", 36, 36), name = text("reviewer_name", 2, 100), role = text("reviewer_role", 0, 100), company = text("reviewer_company", 0, 120), review = text("review_text", 20, 1500);
  if (!projectId || !reviewUuid.test(projectId) || !name || role === null || company === null || !review || typeof row.rating !== "number" || !Number.isInteger(row.rating) || row.rating < 1 || row.rating > 5) return null;
  return { client_project_id: projectId, reviewer_name: name, reviewer_role: role, reviewer_company: company, rating: row.rating, review_text: review };
}
