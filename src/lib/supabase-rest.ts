import { cookies } from "next/headers";

export const supabaseConfig = () => ({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""),
  publicKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

export function isSupabasePublicConfigured() {
  const { url, publicKey } = supabaseConfig();
  return Boolean(url && publicKey);
}

export function isSupabaseServerConfigured() {
  const { url, serviceKey } = supabaseConfig();
  return Boolean(url && serviceKey);
}

export async function supabaseRest<T>(path: string, init: RequestInit = {}, privileged = false): Promise<T> {
  const { url, publicKey, serviceKey } = supabaseConfig();
  const key = privileged ? serviceKey : publicKey;
  if (!url || !key) throw new Error("Supabase is not configured");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey:key, Authorization:`Bearer ${key}`, "Content-Type":"application/json", ...init.headers },
    cache: init.method && init.method !== "GET" ? "no-store" : "no-store",
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export async function verifyStudioAdminToken(token:string|undefined) {
  const { url, publicKey, serviceKey } = supabaseConfig();
  if (!token || !url || !publicKey || !serviceKey) return null;
  const userResponse = await fetch(`${url}/auth/v1/user`, { headers:{ apikey:publicKey, Authorization:`Bearer ${token}` }, cache:"no-store" });
  if (!userResponse.ok) return null;
  const user = await userResponse.json() as { id:string; email?:string };
  if(!user.id)return null;
  const adminResponse = await fetch(`${url}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(user.id)}&select=user_id&limit=1`, { headers:{ apikey:serviceKey, Authorization:`Bearer ${serviceKey}` }, cache:"no-store" });
  if (!adminResponse.ok || ((await adminResponse.json()) as unknown[]).length === 0) return null;
  return user;
}

export async function getAdminSession(){return verifyStudioAdminToken((await cookies()).get("studio_access_token")?.value)}
