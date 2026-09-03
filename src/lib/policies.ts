import { cache } from "react";
import { supabasePublicRest, supabaseRest } from "./supabase-rest";

export type PolicyAudience = "public" | "client" | "both";
export type PolicyVersion = {
  id: string; policy_id: string; version: number; title: string; summary: string;
  content: string; audience: PolicyAudience; is_published: boolean;
  effective_date: string | null; published_at: string | null; created_at: string; updated_at: string;
};
export type Policy = {
  id: string; slug: string; sort_order: number; archived_at: string | null;
  created_at: string; updated_at: string; policy_versions: PolicyVersion[];
};

const publicSelect = "id,slug,sort_order,archived_at,created_at,updated_at,policy_versions!inner(id,policy_id,version,title,summary,content,audience,is_published,effective_date,published_at,created_at,updated_at)";

export const getPublicPolicies = cache(async () => {
  try {
    return await supabasePublicRest<Policy[]>(`policies?archived_at=is.null&policy_versions.is_published=eq.true&policy_versions.audience=in.(public,both)&select=${publicSelect}&order=sort_order.asc,created_at.asc`, 60);
  } catch { return []; }
});

export const getPublicPolicy = cache(async (slug: string) => {
  const policies = await getPublicPolicies();
  return policies.find((policy) => policy.slug === slug) ?? null;
});

export async function getClientPolicies(token: string) {
  return supabaseRest<Policy[]>(`policies?archived_at=is.null&policy_versions.is_published=eq.true&policy_versions.audience=in.(client,both)&select=${publicSelect}&order=sort_order.asc,created_at.asc`, {}, { userAccessToken: token }).catch(() => []);
}

export function currentVersion(policy: Policy) {
  return [...policy.policy_versions].sort((a, b) => b.version - a.version)[0];
}

export function formatPolicyDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-BD", { dateStyle: "long", timeZone: "Asia/Dhaka" }).format(new Date(value)) : "Not set";
}
