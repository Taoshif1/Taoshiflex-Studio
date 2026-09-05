"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const sections = [
  ["Overview", ""],
  ["Timeline", "timeline"],
  ["Milestones", "milestones"],
  ["Updates", "updates"],
  ["Deliverables", "deliverables"],
  ["Billing", "billing"],
  ["Feedback", "feedback"],
] as const;

const legacyHashes: Record<string, string> = {
  "#activity": "timeline",
  "#timeline": "timeline",
  "#milestones": "milestones",
  "#updates": "updates",
  "#deliverables": "deliverables",
  "#billing": "billing",
  "#feedback": "feedback",
};

export function ProjectSubnav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const root = `/client/projects/${projectId}`;

  useEffect(() => {
    const destination = legacyHashes[window.location.hash];
    if (destination && pathname === root) router.replace(`${root}/${destination}`);
  }, [pathname, root, router]);

  return (
    <nav className="client-project-subnav" aria-label="Client Project sections">
      {sections.map(([label, section]) => {
        const href = section ? `${root}/${section}` : root;
        const active = pathname === href;
        return <Link key={label} href={href} aria-current={active ? "page" : undefined}>{label}</Link>;
      })}
    </nav>
  );
}
