import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";
import { StudioConsole } from "../studio-console";

export const metadata: Metadata = {
  title: "Pricing / Studio Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPricingPage() {
  const user = await getAdminSession();
  if (!user) redirect("/studio-admin");
  const packages = await supabaseRest<Array<Record<string, unknown>>>(
    "service_packages?select=*,package_features(*)&order=sort_order.asc",
    {},
    "privileged",
  ).catch(() => []);
  return (
    <StudioConsole
      configured
      email={user.email}
      view="pricing"
      packages={packages}
    />
  );
}
