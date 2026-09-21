import { isSameOrigin } from "@/lib/admin-security";
import { getClientAuthorization } from "@/lib/client-auth";
import { requireClientWorkspaceWritable } from "@/lib/client-workspace-maintenance";
import { parseReview } from "@/lib/review-contract";
import { supabaseRest, SupabaseRestError } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });
  const auth = await getClientAuthorization();
  if (!auth) return Response.json({ error: "Sign in to submit a review." }, { status: 401 });
  const maintenance = await requireClientWorkspaceWritable();
  if (maintenance) return maintenance;
  const review = parseReview(await request.json().catch(() => null));
  if (!review) return Response.json({ error: "Enter a name, 1–5 rating and a review of 20–1,500 characters." }, { status: 400 });
  try {
    await supabaseRest("project_reviews", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(review) }, { userAccessToken: auth.token });
    return Response.json({ ok: true });
  } catch (error) {
    const duplicate = error instanceof SupabaseRestError && error.code === "23505";
    return Response.json({ error: duplicate ? "You have already submitted a review for this project." : "Review could not be submitted. Only clients of completed projects can submit a review." }, { status: duplicate ? 409 : 403 });
  }
}
