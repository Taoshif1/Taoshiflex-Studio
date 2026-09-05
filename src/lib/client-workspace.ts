import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { getClientAuthorization } from "@/lib/client-auth";
import type { ClientProject } from "@/lib/client-projects";
import { supabaseRest } from "@/lib/supabase-rest";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const loadClientProject = cache(async function loadClientProject(id: string) {
  const authorization = await getClientAuthorization();
  if (!authorization) redirect("/client");
  if (!uuid.test(id)) notFound();

  const access = { userAccessToken: authorization.token };
  const projects = await supabaseRest<ClientProject[]>(
    `client_projects?id=eq.${encodeURIComponent(id)}&select=id,reference,name,client_name,summary,status,progress,current_phase,next_action,start_date,target_date,created_at,updated_at&limit=1`,
    {},
    access,
  ).catch(() => null);

  if (!projects) redirect("/client");
  if (!projects[0]) notFound();
  return { authorization, access, project: projects[0] };
});

export function clientProjectHref(projectId: string, section?: string) {
  return `/client/projects/${projectId}${section ? `/${section}` : ""}`;
}
