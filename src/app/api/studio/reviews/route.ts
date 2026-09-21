import { authorizeMutation } from "@/lib/admin-security";
import { reviewUuid } from "@/lib/review-contract";
import { supabaseRest } from "@/lib/supabase-rest";

export async function PATCH(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  const allowed = ["id", "published", "featured", "sort_order", "public_project_id", "moderation_note"];
  if (!body || typeof body !== "object" || Object.keys(body).some(key => !allowed.includes(key)) || typeof body.id !== "string" || !reviewUuid.test(body.id) || typeof body.published !== "boolean" || typeof body.featured !== "boolean" || (body.featured && !body.published) || !Number.isInteger(body.sort_order) || Math.abs(body.sort_order) > 100000 || (body.public_project_id !== null && (typeof body.public_project_id !== "string" || !reviewUuid.test(body.public_project_id))) || typeof body.moderation_note !== "string" || body.moderation_note.length > 2000) {
    return Response.json({ error: "Invalid moderation settings. Featured reviews must be published." }, { status: 400 });
  }
  try {
    const rows = await supabaseRest<Array<{ id: string }>>(`project_reviews?id=eq.${body.id}&select=id`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ published: body.published, featured: body.featured, sort_order: body.sort_order, public_project_id: body.public_project_id, moderation_note: body.moderation_note.trim() }) }, "privileged");
    if (!rows.length) return Response.json({ error: "Review not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Review could not be updated." }, { status: 409 }); }
}
