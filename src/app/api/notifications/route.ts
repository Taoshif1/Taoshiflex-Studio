import { cleanText, isSameOrigin } from "@/lib/admin-security";
import { getClientAuthorization } from "@/lib/client-auth";
import { getAdminAuthorization, supabaseRest } from "@/lib/supabase-rest";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getAuthorization() {
  const admin = await getAdminAuthorization();
  if (admin) return admin;
  return getClientAuthorization();
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  const authorization = await getAuthorization();
  if (!authorization) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { action?: unknown; id?: unknown } | null;
  const action = cleanText(body?.action, 20, true);
  if (action !== "one" && action !== "all") {
    return Response.json({ error: "Valid notification action is required." }, { status: 400 });
  }

  const access = { userAccessToken: authorization.token };
  const recipientFilter = "recipient_user_id=eq." + encodeURIComponent(authorization.user.id);
  try {
    if (action === "one") {
      const id = cleanText(body?.id, 80, true);
      if (!id || !uuid.test(id)) {
        return Response.json({ error: "Valid notification is required." }, { status: 400 });
      }
      const rows = await supabaseRest<Array<{ id: string; read_at: string | null }>>(
        "notifications?id=eq." + encodeURIComponent(id) + "&" + recipientFilter + "&select=id,read_at&limit=1",
        {},
        access,
      );
      if (!rows.length) {
        return Response.json({ error: "Notification was not found." }, { status: 404 });
      }
      if (rows[0].read_at) return Response.json({ ok: true });
      await supabaseRest(
        "notifications?id=eq." + encodeURIComponent(id) + "&" + recipientFilter + "&read_at=is.null",
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ read_at: new Date().toISOString() }),
        },
        access,
      );
      return Response.json({ ok: true });
    }

    await supabaseRest(
      "notifications?" + recipientFilter + "&read_at=is.null",
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ read_at: new Date().toISOString() }),
      },
      access,
    );
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Notifications could not be updated. Confirm migration 009 is active." },
      { status: 409 },
    );
  }
}
