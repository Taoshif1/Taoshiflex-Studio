import { cookies } from "next/headers";
import { isSameOrigin } from "@/lib/admin-security";
import { clearLegacyClientCookies } from "@/lib/supabase/legacy-client-cookies";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: Request) {
  if (!isSameOrigin(request))
    return Response.json(
      { error: "Cross-origin request rejected." },
      { status: 403 },
    );

  const cookieStore = await cookies();
  clearLegacyClientCookies(cookieStore);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error)
      return Response.json(
        { error: "Sign-out could not be confirmed. Please retry." },
        { status: 503 },
      );
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Sign-out could not be confirmed. Please retry." },
      { status: 503 },
    );
  }
}
