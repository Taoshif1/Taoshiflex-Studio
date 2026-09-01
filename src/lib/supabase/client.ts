import { createBrowserClient } from "@supabase/ssr";
import { supabaseAuthFetch } from "./auth-fetch";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { fetch: supabaseAuthFetch } },
  );
}
