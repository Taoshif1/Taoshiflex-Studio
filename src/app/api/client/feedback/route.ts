import { isSameOrigin, cleanText } from "@/lib/admin-security";
import { getClientAuthorization } from "@/lib/client-auth";
import {
  feedbackIntents,
  feedbackTargetTypes,
  type FeedbackIntent,
  type FeedbackTargetType,
} from "@/lib/client-projects";
import { supabaseRest } from "@/lib/supabase-rest";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const targetTables: Record<Exclude<FeedbackTargetType, "project">, string> = {
  milestone: "project_milestones",
  update: "project_updates",
  deliverable: "project_deliverables",
};

type FeedbackRequest = {
  projectId?: unknown;
  targetType?: unknown;
  targetId?: unknown;
  intent?: unknown;
  message?: unknown;
};

function validId(value: unknown): value is string {
  return typeof value === "string" && uuid.test(value);
}

function validateMessage(intent: FeedbackIntent, value: unknown) {
  const message = cleanText(value, 2000);
  if (message === null) return null;
  if (intent === "changes_requested" && message.length < 10) return null;
  if (intent === "comment" && message.length < 2) return null;
  return message;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }

  const authorization = await getClientAuthorization();
  if (!authorization) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as FeedbackRequest | null;
  const projectId = body?.projectId;
  const targetType = body?.targetType;
  const intent = body?.intent;

  if (
    !validId(projectId) ||
    typeof targetType !== "string" ||
    !feedbackTargetTypes.includes(targetType as FeedbackTargetType) ||
    typeof intent !== "string" ||
    !feedbackIntents.includes(intent as FeedbackIntent)
  ) {
    return Response.json({ error: "Valid project, target and feedback intent are required." }, { status: 400 });
  }

  const typedTarget = targetType as FeedbackTargetType;
  const targetId = typedTarget === "project" ? null : body?.targetId;
  if (typedTarget !== "project" && !validId(targetId)) {
    return Response.json({ error: "A valid feedback target is required." }, { status: 400 });
  }

  const message = validateMessage(intent as FeedbackIntent, body?.message);
  if (message === null) {
    return Response.json(
      { error: intent === "changes_requested" ? "Explain the requested change in at least 10 characters." : "Enter a meaningful comment within 2,000 characters." },
      { status: 400 },
    );
  }

  const access = { userAccessToken: authorization.token };
  try {
    const membershipRequest = supabaseRest<Array<{ id: string }>>(
      `client_project_members?project_id=eq.${projectId}&user_id=eq.${authorization.user.id}&select=id&limit=1`,
      {},
      access,
    );
    const targetRequest = typedTarget === "project"
      ? supabaseRest<Array<{ id: string }>>(
          `client_projects?id=eq.${projectId}&select=id&limit=1`,
          {},
          access,
        )
      : supabaseRest<Array<{ id: string }>>(
          `${targetTables[typedTarget]}?id=eq.${targetId}&project_id=eq.${projectId}&select=id&limit=1`,
          {},
          access,
        );
    const [memberships, targets] = await Promise.all([membershipRequest, targetRequest]);
    if (!memberships.length) {
      return Response.json({ error: "You do not have access to this Client Project." }, { status: 403 });
    }

    if (typedTarget === "project") {
      if (!targets.length) {
        return Response.json({ error: "Client Project was not found." }, { status: 404 });
      }
    } else {
      if (!targets.length) {
        return Response.json({ error: "Feedback target does not belong to this Client Project." }, { status: 400 });
      }
    }

    await supabaseRest(
      "project_feedback",
      {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          project_id: projectId,
          target_type: typedTarget,
          target_id: targetId,
          intent,
          message,
        }),
      },
      access,
    );
    return Response.json({ ok: true, message: "Feedback sent." });
  } catch {
    return Response.json(
      { error: "Feedback could not be saved. Confirm migration 007 is active and try again." },
      { status: 409 },
    );
  }
}
