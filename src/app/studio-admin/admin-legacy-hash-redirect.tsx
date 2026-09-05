"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const destinations: Record<string, string> = {
  "#projects": "/studio-admin/projects",
  "#pricing-admin": "/studio-admin/pricing",
  "#github": "/studio-admin/github",
  "#studio-presence-admin": "/studio-admin/settings/presence",
  "#inquiry-alerts": "/studio-admin/settings/alerts",
  "#assistant-admin": "/studio-admin/settings/assistant",
};

export function AdminLegacyHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const destination = destinations[window.location.hash];
    if (destination) router.replace(destination);
  }, [router]);
  return null;
}
