import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";
import { StudioConsole } from "../studio-console";

export const metadata: Metadata = {
  title: "Public Projects / Studio Admin",
  robots: { index: false, follow: false },
};

export default async function AdminProjectsPage() {
  const user = await getAdminSession();
  if (!user) redirect("/studio-admin");
  const projects = await supabaseRest<Array<Record<string, unknown>>>(
    "projects?select=*,project_media(*)&order=sort_order.asc",
    {},
    "privileged",
  ).catch(() => []);
  return (
    <StudioConsole
      configured
      email={user.email}
      view="projects"
      projects={projects}
    />
  );
}
