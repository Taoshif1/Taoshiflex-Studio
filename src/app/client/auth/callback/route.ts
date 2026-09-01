import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { clearLegacyClientCookies } from "@/lib/supabase/legacy-client-cookies";
import { createClient } from "@/lib/supabase/server";

type ClientAuthError =
  | "callback_code_missing"
  | "code_exchange_failed"
  | "session_validation_failed";

function clientRedirect(request: NextRequest, error?: ClientAuthError) {
  const destination = new URL("/client", request.url);
  if (error) destination.searchParams.set("auth_error", error);
  const response = NextResponse.redirect(destination, 303);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  return response;
}

export async function GET(request: NextRequest) {
  clearLegacyClientCookies(await cookies());
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return clientRedirect(request, "callback_code_missing");

  try {
    const supabase = await createClient();
    const flowId = request.nextUrl.searchParams.get("sb_flow_id");
    const { error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (error) return clientRedirect(request, "code_exchange_failed");

    const { data, error: validationError } = await supabase.auth.getClaims();
    if (validationError || !data?.claims?.sub)
      return clientRedirect(request, "session_validation_failed");

    return clientRedirect(request);
  } catch {
    return clientRedirect(request, "code_exchange_failed");
  }
}
