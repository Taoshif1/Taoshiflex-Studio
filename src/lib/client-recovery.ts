import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { supabaseConfig } from "@/lib/supabase-rest";

const recoveryCookieName = "taoshiflex-client-recovery";
const recoveryLifetimeSeconds = 15 * 60;

type RecoveryIntent = {
  sub: string;
  exp: number;
};

function recoverySecret() {
  const { secretKey, legacyServiceRoleKey } = supabaseConfig();
  const secret = secretKey ?? legacyServiceRoleKey;

  if (!secret) {
    throw new Error("Supabase server credentials are unavailable.");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", recoverySecret()).update(value).digest("base64url");
}

export async function setRecoveryIntent(userId: string) {
  const payload: RecoveryIntent = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + recoveryLifetimeSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const cookieStore = await cookies();

  cookieStore.set(recoveryCookieName, encoded + "." + sign(encoded), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/client",
    maxAge: recoveryLifetimeSeconds,
  });
}

export async function hasRecoveryIntent(userId: string) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(recoveryCookieName)?.value;
  if (!raw) return false;

  const separator = raw.lastIndexOf(".");
  if (separator < 1) return false;

  const encoded = raw.slice(0, separator);
  const suppliedSignature = raw.slice(separator + 1);
  const expectedSignature = sign(encoded);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as RecoveryIntent;

    return (
      payload.sub === userId &&
      Number.isInteger(payload.exp) &&
      payload.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export async function clearRecoveryIntent() {
  const cookieStore = await cookies();
  cookieStore.set(recoveryCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/client",
    maxAge: 0,
  });
}
