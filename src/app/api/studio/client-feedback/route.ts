import { authorizeMutation, cleanText } from "@/lib/admin-security";
import type { FeedbackIntent, FeedbackStatus } from "@/lib/client-projects";
import { supabaseRest } from "@/lib/supabase-rest";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type AdminFeedbackRequest = {
  action?: unknown;
  id?: unknown;
  projectId?: unknown;
  response?: unknown;
};
type FeedbackRow = {
  id: string;
  intent: FeedbackIntent;
  status: FeedbackStatus;
  studio_response: string | null;
};

export async function PATCH(request: Request) {
  const authorization = await authorizeMutation(request);
  if (authorization.error) return authorization.error;

  const body = (await request.json().catch(() => null)) as AdminFeedbackRequest | null;
  const action = body?.action;
  const id = body?.id;
  const projectId = body?.projectId;
  if (
    (action !== "reply" && action !== "resolve") ||
    typeof id !== "string" ||
    !uuid.test(id) ||
    typeof projectId !== "string" ||
    !uuid.test(projectId)
  ) {
    return Response.json({ error: "Valid feedback operation is required." }, { status: 400 });
  }

  try {
    const rows = await supabaseRest<FeedbackRow[]>(
      `project_feedback?id=eq.${id}&project_id=eq.${projectId}&select=id,intent,status,studio_response&limit=1`,
      {},
      "privileged",
    );
    const feedback = rows[0];
    if (!feedback) return Response.json({ error: "Feedback was not found." }, { status: 404 });
    if (feedback.status === "resolved") {
      return Response.json({ error: "Resolved feedback remains closed as history." }, { status: 409 });
    }

    const response = cleanText(body?.response, 2000);
    if (response === null || (action === "reply" && response.length < 2)) {
      return Response.json({ error: "Enter a Studio response between 2 and 2,000 characters." }, { status: 400 });
    }
    if (action === "resolve" && feedback.intent === "changes_requested" && !feedback.studio_response && response.length < 2) {
      return Response.json({ error: "Reply before resolving a change request." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const update: {
      status?: FeedbackStatus;
      studio_response?: string;
      responded_by?: string;
      responded_at?: string;
      resolved_at?: string;
    } = {};
    if (response.length >= 2) {
      update.studio_response = response;
      update.responded_by = authorization.user.id;
      update.responded_at = now;
    }
    if (action === "resolve") {
      update.status = "resolved";
      update.resolved_at = now;
    }

    await supabaseRest(
      `project_feedback?id=eq.${id}&project_id=eq.${projectId}`,
      { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(update) },
      "privileged",
    );
    return Response.json({ ok: true, message: action === "resolve" ? "Feedback resolved." : "Studio response saved." });
  } catch {
    return Response.json({ error: "Feedback could not be updated. Confirm migration 007 is active." }, { status: 409 });
  }
}
