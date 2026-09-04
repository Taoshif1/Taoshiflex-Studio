import { NextResponse } from "next/server";

import {
  clearRecoveryIntent,
  hasRecoveryIntent,
  setRecoveryIntent,
} from "@/lib/client-recovery";
import { isSameOrigin } from "@/lib/admin-security";
import { createClient } from "@/lib/supabase/server";

const noStoreHeaders = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  "Referrer-Policy": "no-referrer",
};

function resetRedirect(request: Request, recovery: string) {
  return NextResponse.redirect(
    new URL("/client/reset-password?recovery=" + recovery, request.url),
    { status: 303, headers: noStoreHeaders },
  );
}

function isTrustedRecoveryOrigin(request: Request) {
  if (isSameOrigin(request)) return true;
  const origin = request.headers.get("origin");
  return (
    (origin === null || origin === "null") &&
    request.headers.get("sec-fetch-site") === "same-origin"
  );
}

export async function POST(request: Request) {
  if (!isTrustedRecoveryOrigin(request)) {
    return resetRedirect(request, "failure");
  }

  await clearRecoveryIntent();

  let tokenHash = "";
  let type = "";
  try {
    const form = await request.formData();
    tokenHash = String(form.get("token_hash") ?? "").trim();
    type = String(form.get("type") ?? "");
  } catch {
    return resetRedirect(request, "invalid");
  }

  if (type !== "recovery" || tokenHash.length < 32 || tokenHash.length > 512) {
    return resetRedirect(request, "invalid");
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

    if (error || !data.user) {
      return resetRedirect(request, "expired");
    }

    await setRecoveryIntent(data.user.id);
    return resetRedirect(request, "verified");
  } catch {
    return resetRedirect(request, "failure");
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "This password update could not be verified." },
      { status: 403, headers: noStoreHeaders },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json(
      { error: "Enter a valid new password." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  if (password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: "Use a password between 8 and 128 characters." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? "";

    if (userError || !userId || !(await hasRecoveryIntent(userId))) {
      await clearRecoveryIntent();
      return NextResponse.json(
        { error: "This recovery link is no longer available." },
        { status: 401, headers: noStoreHeaders },
      );
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return NextResponse.json(
        { error: "We couldn't update your password. Please try again." },
        { status: 400, headers: noStoreHeaders },
      );
    }

    await clearRecoveryIntent();
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch {
    return NextResponse.json(
      { error: "We couldn't update your password. Please try again." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
