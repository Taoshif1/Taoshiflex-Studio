import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function resetRedirect(requestUrl: URL, state?: "invalid" | "expired") {
  const target = new URL("/client/reset-password", requestUrl.origin);
  if (state) target.searchParams.set("recovery", state);
  const response = NextResponse.redirect(target);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const flowId = requestUrl.searchParams.get("sb_flow_id");

  if (!code) {
    return resetRedirect(requestUrl, "invalid");
  }

  try {
    const supabase = await createClient();
    let recoveryConfirmed = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") recoveryConfirmed = true;
    });
    let exchangeError = false;

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined,
      );
      exchangeError = Boolean(error);
    } finally {
      subscription.unsubscribe();
    }

    if (exchangeError || !recoveryConfirmed) {
      if (!exchangeError) await supabase.auth.signOut({ scope: "local" });
      return resetRedirect(
        requestUrl,
        exchangeError ? "expired" : "invalid",
      );
    }

    return resetRedirect(requestUrl);
  } catch {
    return resetRedirect(requestUrl, "expired");
  }
}
