import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function resetRedirect(requestUrl: URL, state?: "invalid" | "expired") {
  const target = new URL("/client/reset-password", requestUrl.origin);
  if (state) target.searchParams.set("recovery", state);
  return target;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(resetRedirect(requestUrl, "invalid"));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(resetRedirect(requestUrl, "expired"));
    }

    return NextResponse.redirect(resetRedirect(requestUrl));
  } catch {
    return NextResponse.redirect(resetRedirect(requestUrl, "expired"));
  }
}
