"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Policy, PolicyAudience, PolicyVersion } from "@/lib/policies";

const headers = { "Content-Type": "application/json" };
const filters: Array<{ label: string; value: "all" | PolicyAudience }> = [
  { label: "All", value: "all" },
  { label: "Public", value: "public" },
  { label: "Client", value: "client" },
  { label: "Both", value: "both" },
];
const placeholderPolicyPattern = /\b(review before publishing|starter (?:wording|guidance|expectations|overview|process|terms)|this starter|lorem ipsum|todo|your-domain|placeholder)\b/i;

function isFarFuture(value: string) {
  if (!value) return false;
  const effective = new Date(`${value}T00:00:00Z`).getTime();
  return Number.isFinite(effective) && effective - Date.now() > 366 * 24 * 60 * 60 * 1000;
}

export function PolicyManager({ policies }: { policies: Policy[] }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"all" | PolicyAudience>("all");

  async function mutate(method: string, body: unknown, success: string) {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/studio/policies", {
        method,
        headers,
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Policy action failed.");
      setMessage(success);
      router.refresh();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Policy action failed.");
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const records = policies.map((policy) => {
    const versions = [...policy.policy_versions].sort((a, b) => b.version - a.version);
    const editable = versions.find((version) => !version.published_at);
    return { policy, versions, editable, current: editable ?? versions[0] };
  });
  const visibleRecords = filter === "all"
    ? records
    : records.filter((record) => record.current?.audience === filter);
  const createStarters = () => void mutate(
    "POST",
    { kind: "starter-drafts" },
    "Starter policy drafts are ready for review.",
  );

  return <div className="policy-manager">
    <p className="admin-live-message" aria-live="polite">{pending ? "Saving..." : message}</p>

    {policies.length === 0 ? <section className="policy-empty-state">
      <div>
        <p className="eyebrow">No policy documents yet</p>
        <h2>Start with editable drafts</h2>
        <p>Policies are versioned documents. Nothing becomes public or Client-visible until an Admin explicitly publishes a reviewed version.</p>
        <button type="button" disabled={pending} onClick={createStarters}>Create starter drafts</button>
      </div>
      <details>
        <summary>Create one policy manually</summary>
        <PolicyCreateForm pending={pending} create={(body) => void mutate("POST", body, "Policy draft created.")} />
      </details>
    </section> : <>
      <section className="policy-tools">
        <div className="policy-filter" role="group" aria-label="Filter policies by audience">
          {filters.map((item) => <button
            type="button"
            key={item.value}
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >{item.label}</button>)}
        </div>
        <div className="policy-tool-actions">
          <button type="button" disabled={pending} onClick={createStarters}>Create starter drafts</button>
          <details>
            <summary>Create another policy draft</summary>
            <PolicyCreateForm pending={pending} create={(body) => void mutate("POST", body, "Policy draft created.")} />
          </details>
        </div>
      </section>

      {visibleRecords.length ? visibleRecords.map(({ policy, versions, editable, current }) => <section
        key={policy.id}
        className={policy.archived_at ? "policy-record archived" : "policy-record"}
      >
        <header>
          <div><p className="eyebrow">{policy.slug} / {policy.archived_at ? "Archived" : "Active"}</p><h2>{current?.title || policy.slug}</h2></div>
          {!editable && current ? <button disabled={pending} onClick={() => void mutate("PATCH", { kind: "new-version", policyId: policy.id }, "New version draft created.")}>Create next version</button> : null}
        </header>
        <details className="policy-settings">
          <summary>Document settings</summary>
          <PolicyIdentity policy={policy} pending={pending} save={(body) => void mutate("PATCH", body, "Policy settings saved.")} />
        </details>
        {editable ? <VersionForm key={editable.id} version={editable} canDelete={versions.length > 1} pending={pending} mutate={mutate} /> : <p className="policy-lock">Published versions remain historical and locked. Create a new version to revise the wording.</p>}
        <div className="policy-history"><strong>Version history</strong>{versions.map((version) => <span key={version.id}>v{version.version} / {version.is_published ? "Published / Current version" : version.published_at ? "Historical version" : "Draft"} / {version.audience} / Effective {version.effective_date || "Not set"}</span>)}</div>
      </section>) : <p className="policy-filter-empty">No policies match this audience filter.</p>}
    </>}
  </div>;
}

function PolicyCreateForm({ pending, create }: { pending: boolean; create: (body: unknown) => void }) {
  return <form className="editor-form policy-create" onSubmit={(event) => {
    event.preventDefault();
    create(Object.fromEntries(new FormData(event.currentTarget)));
  }}>
    <label>Title<input name="title" required maxLength={160} /></label>
    <label>Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={80} /><small>URL-friendly identifier; usually do not change after publishing.</small></label>
    <label>Audience<select name="audience" defaultValue="both"><option value="public">Public</option><option value="client">Client</option><option value="both">Both</option></select><AudienceHelp /></label>
    <label>Sort order<input name="sortOrder" type="number" defaultValue="0" /></label>
    <label className="wide">Summary<textarea name="summary" rows={2} maxLength={500} /></label>
    <label className="wide">Content (plain structured text)<textarea name="content" rows={7} maxLength={100000} /></label>
    <label>Effective date<input name="effectiveDate" type="date" /><small>Date the policy is intended to take effect.</small></label>
    <button disabled={pending}>Create draft</button>
  </form>;
}

function PolicyIdentity({ policy, pending, save }: { policy: Policy; pending: boolean; save: (body: unknown) => void }) {
  return <form className="editor-form policy-identity" onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save({
      kind: "policy",
      policyId: policy.id,
      slug: form.get("slug"),
      sortOrder: Number(form.get("sortOrder")),
      archived: form.get("archived") === "on",
    });
  }}>
    <label>Slug<input name="slug" defaultValue={policy.slug} required /><small>URL-friendly identifier; usually do not change after publishing.</small></label>
    <label>Sort order<input name="sortOrder" type="number" defaultValue={policy.sort_order} /></label>
    <label className="check"><input name="archived" type="checkbox" defaultChecked={Boolean(policy.archived_at)} /><span>Archive document family</span></label>
    <button disabled={pending}>Save settings</button>
  </form>;
}

function VersionForm({ version, canDelete, pending, mutate }: {
  version: PolicyVersion;
  canDelete: boolean;
  pending: boolean;
  mutate: (method: string, body: unknown, success: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(version.title);
  const [audience, setAudience] = useState(version.audience);
  const [effectiveDate, setEffectiveDate] = useState(version.effective_date || "");
  const [summary, setSummary] = useState(version.summary);
  const [content, setContent] = useState(version.content);
  const [dirty, setDirty] = useState(false);
  const placeholderWarning = placeholderPolicyPattern.test(`${summary}\n${content}`);
  const futureWarning = isFarFuture(effectiveDate);
  const guidanceId = `policy-publish-guidance-${version.id}`;

  function publish() {
    const dateLabel = effectiveDate || "no effective date";
    const confirmed = confirm(`Publish "${title}" v${version.version} for the ${audience} audience with ${dateLabel} as its effective date? Published wording remains in version history.`);
    if (confirmed) void mutate("PATCH", { kind: "publish", id: version.id, publish: true }, "Policy published.");
  }

  return <form className="editor-form policy-version" onChange={() => setDirty(true)} onSubmit={async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await mutate("PATCH", { kind: "version", id: version.id, ...Object.fromEntries(form) }, "Draft saved.");
    if (saved) setDirty(false);
  }}>
    <div className="wide policy-version-heading"><h3>Editable draft / Version {version.version}</h3><p>Published versions remain historical and locked; create a new version to revise wording.</p></div>
    <label>Title<input name="title" value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
    <label>Audience<select name="audience" value={audience} onChange={(event) => setAudience(event.target.value as PolicyAudience)}><option value="public">Public</option><option value="client">Client</option><option value="both">Both</option></select><AudienceHelp /></label>
    <label>Effective date<input name="effectiveDate" type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} /><small>Date the policy is intended to take effect.</small></label>
    <label className="wide">Summary<textarea name="summary" rows={2} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
    <label className="wide">Content<textarea name="content" rows={12} value={content} onChange={(event) => setContent(event.target.value)} required /></label>
    <div className="policy-safety wide" aria-live="polite">
      <p id={guidanceId}><strong>Before publishing:</strong> review the wording, audience, version, and effective date. Publishing locks this version into history.</p>
      {dirty ? <p>Save the current draft changes before publishing.</p> : null}
      {futureWarning ? <p>This effective date is more than one year away. Confirm that the future date is intentional.</p> : null}
      {placeholderWarning ? <p>Placeholder or starter language may remain. Review and replace it before publishing.</p> : null}
    </div>
    <div className="editor-actions wide">
      <button disabled={pending}>Save draft</button>
      <button type="button" disabled={pending || dirty} aria-describedby={guidanceId} onClick={publish}>Publish reviewed version</button>
      {canDelete ? <button type="button" className="danger" disabled={pending} onClick={() => confirm("Delete this never-published draft?") && void mutate("DELETE", { id: version.id }, "Draft deleted.")}>Delete draft</button> : <span>To remove this only draft from active use, archive the policy above.</span>}
    </div>
  </form>;
}

function AudienceHelp() {
  return <small>Public = public policy pages; Client = authenticated Client Workspace; Both = visible in both places.</small>;
}
