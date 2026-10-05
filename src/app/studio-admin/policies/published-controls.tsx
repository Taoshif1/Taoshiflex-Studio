"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Policy } from "@/lib/policies";
import { PendingButton } from "@/components/ui/loading";
import { useToasts } from "@/components/ui/toast";

export function PublishedPolicyControls({ policies }: { policies: Policy[] }) {
  const router = useRouter(), busy = useRef(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { toast } = useToasts();
  const published = policies.flatMap(policy => policy.policy_versions.filter(version => version.is_published).map(version => ({ policy, version })));
  async function unpublish(id: string) {
    if (busy.current || !confirm("Unpublish this policy? It will disappear from its audience until republished.")) return;
    busy.current = true; setPendingId(id);
    try {
      const response = await fetch("/api/studio/policies", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "publish", id, publish: false }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Policy could not be unpublished.");
      toast("success", "Policy unpublished."); router.refresh();
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Policy could not be unpublished.");
    } finally { busy.current = false; setPendingId(null); }
  }
  if (!published.length) return null;
  return <section className="published-policy-controls">
    <header><div><p className="eyebrow">Published now</p><h2>Publication controls</h2></div></header>
    {published.map(({ policy, version }) => <article key={version.id}>
      <div><strong>{version.title}</strong><span>{policy.slug} · Version {version.version} · {version.audience}</span></div>
      <PendingButton className="danger" disabled={pendingId !== null} pending={pendingId === version.id} pendingLabel="Unpublishing…" onClick={() => unpublish(version.id)}>Unpublish</PendingButton>
    </article>)}
  </section>;
}
