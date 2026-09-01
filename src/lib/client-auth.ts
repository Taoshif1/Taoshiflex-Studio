import { createClient } from "./supabase/server";

export type ClientIdentity = { id: string; email?: string };

export async function getClientAuthorization() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (error || !claims?.sub) return null;

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (sessionError || !token) return null;

    const user: ClientIdentity = {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : undefined,
    };
    return { user, token };
  } catch {
    return null;
  }
}

export async function getClientSession() {
  return (await getClientAuthorization())?.user ?? null;
}
