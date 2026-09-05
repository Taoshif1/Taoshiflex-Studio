import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/supabase-rest";
import { StudioConsole } from "../studio-console";

export const metadata: Metadata = {
  title: "Repository Import / Studio Admin",
  robots: { index: false, follow: false },
};

export default async function AdminGithubPage() {
  const user = await getAdminSession();
  if (!user) redirect("/studio-admin");
  return <StudioConsole configured email={user.email} view="github" />;
}
