"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clientProjectStatuses,
  deliverableStatuses,
  milestoneStatuses,
  statusLabel,
  type ClientProject,
  type ClientProjectMember,
  type ProjectDeliverable,
  type ProjectMilestone,
  type ProjectUpdate,
} from "@/lib/client-projects";
type Props = {
  project: ClientProject;
  members: ClientProjectMember[];
  milestones: ProjectMilestone[];
  updates: ProjectUpdate[];
  deliverables: ProjectDeliverable[];
};
const headers = { "Content-Type": "application/json" };
export function ClientProjectEditor({
  project,
  members,
  milestones,
  updates,
  deliverables,
}: Props) {
  const router = useRouter(),
    pendingRef = useRef(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [passwordMember, setPasswordMember] = useState<ClientProjectMember | null>(null);
  const closePasswordDialog = useCallback(() => setPasswordMember(null), []);
  const activeMilestones=milestones.filter(item=>item.status!=="completed"&&!item.archived_at);
  const previousMilestones=milestones.filter(item=>item.status==="completed"||Boolean(item.archived_at));
  async function mutate(method: string, body: unknown, success: string) {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/studio/client-projects", {
          method,
          headers,
          body: JSON.stringify(body),
        }),
        result = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
      if (!response.ok) throw new Error(result.error || "Operation failed.");
      setMessage(result.message || success);
      router.refresh();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation failed.");
      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }
  function formBody(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return new FormData(event.currentTarget);
  }
  return (
    <div className="client-project-editor">
      <p className="admin-live-message" aria-live="polite">
        {pending ? "Saving…" : message}
      </p>
      <section>
        <header>
          <p className="eyebrow">Overview</p>
          <h2>Project controls</h2>
        </header>
        <form
          className="editor-form"
          onSubmit={(event) => {
            const form = formBody(event);
            mutate(
              "PATCH",
              {
                kind: "project",
                projectId: project.id,
                name: form.get("name"),
                clientName: form.get("clientName"),
                summary: form.get("summary"),
                status: form.get("status"),
                progress: Number(form.get("progress")),
                currentPhase: form.get("currentPhase"),
                nextAction: form.get("nextAction"),
                startDate: form.get("startDate"),
                targetDate: form.get("targetDate"),
              },
              "Client Project saved.",
            );
          }}
        >
          <div className="field-grid">
            <Field name="name" label="Project name" value={project.name} />
            <Field
              name="clientName"
              label="Client / business"
              value={project.client_name}
            />
            <label>
              Status
              <select name="status" defaultValue={project.status}>
                {clientProjectStatuses.map((item) => (
                  <option value={item} key={item}>
                    {statusLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <Field
              name="progress"
              label="Progress (0–100)"
              type="number"
              value={project.progress}
              min="0"
              max="100"
            />
            <Field
              name="currentPhase"
              label="Current phase"
              value={project.current_phase}
            />
            <Field
              name="startDate"
              label="Start date"
              type="date"
              value={project.start_date || ""}
            />
            <Field
              name="targetDate"
              label="Target date"
              type="date"
              value={project.target_date || ""}
            />
          </div>
          <Area
            name="summary"
            label="Client-visible summary"
            value={project.summary}
          />
          <Area
            name="nextAction"
            label="Next action"
            value={project.next_action}
          />
          <button disabled={pending}>Save project overview</button>
        </form>
        {project.source_inquiry_id ? (
          <Link
            className="admin-list-link"
            href={`/studio-admin/inquiries/${project.source_inquiry_id}`}
          >
            Open source inquiry →
          </Link>
        ) : null}
      </section>
      <section>
        <header>
          <p className="eyebrow">Access</p>
          <h2>Members</h2>
        </header>
        <div className="member-list">
          {members.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.email}</strong>
                <span>Role / {statusLabel(item.role)}</span>
              </div>
              <div className="member-access">
                <span>Access assigned</span>
                {item.role === "client" ? <button type="button" disabled={pending} onClick={() => setPasswordMember(item)}>Reset password</button> : null}
                <button
                  type="button"
                  className="danger"
                  disabled={pending}
                  onClick={() =>
                    mutate(
                      "DELETE",
                      { kind: "member", id: item.id, projectId: project.id },
                      "Member removed.",
                    )
                  }
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
        <p className="member-security-copy">Removing access deletes only this project membership; it does not delete the Auth account or access to other Client Projects. A password reset changes sign-in for that Client Auth account across every assigned project.</p>
        <form
          className="editor-form compact-admin-form"
          onSubmit={(event) => {
            const form = formBody(event);
            const temporaryPassword = form.get("temporaryPassword");
            const passwordField = event.currentTarget.elements.namedItem(
              "temporaryPassword",
            );
            if (passwordField instanceof HTMLInputElement)
              passwordField.value = "";
            mutate(
              "POST",
              {
                kind: "member",
                projectId: project.id,
                email: form.get("email"),
                role: form.get("role"),
                temporaryPassword,
              },
              "Client access created.",
            );
          }}
        >
          <Field name="email" label="Email" type="email" />
          <label>
            Role
            <select name="role" defaultValue="client">
              <option value="client">Client</option>
              <option value="studio">Studio</option>
            </select>
          </label>
          <Field
            name="temporaryPassword"
            label="Temporary password (only needed for a new account)"
            type="password"
            minLength={8}
            autoComplete="new-password"
            optional
          />
          <button disabled={pending}>Create Client Access</button>
          <small>
            New clients receive an Auth account using this temporary password.
            Existing clients keep their current password. Membership—not the
            reference—authorizes the workspace.
          </small>
        </form>
      </section>
      <section>
        <header>
          <p className="eyebrow">Plan</p>
          <h2>Milestones</h2>
        </header>
        <div className="admin-item-list">
          {activeMilestones.map((item, index) => (
            <MilestoneForm
              key={item.id}
              item={item}
              pending={pending}
              save={(body) =>
                mutate(
                  "PATCH",
                  {
                    kind: "milestone",
                    projectId: project.id,
                    id: item.id,
                    ...body,
                  },
                  "Milestone saved.",
                )
              }
              archive={() =>
                mutate("PATCH",{kind:"milestone-archive",projectId:project.id,id:item.id,archive:true},"Milestone archived.")
              }
              remove={item.status==="pending"?() =>
                mutate(
                  "DELETE",
                  { kind: "milestone", projectId: project.id, id: item.id },
                  "Unused milestone draft deleted.",
                )
              :undefined}
              move={(direction) => {
                const ids = activeMilestones.map((value) => value.id),
                  target = index + direction;
                if (target < 0 || target >= ids.length) return;
                [ids[index], ids[target]] = [ids[target], ids[index]];
                mutate(
                  "PATCH",
                  {
                    kind: "milestone-order",
                    projectId: project.id,
                    orderedIds: ids,
                  },
                  "Milestones reordered.",
                );
              }}
            />
          ))}
        </div>
        <MilestoneForm
          pending={pending}
          create
          save={(body) =>
            mutate(
              "POST",
              {
                kind: "milestone",
                projectId: project.id,
                sortOrder: activeMilestones.length,
                ...body,
              },
              "Milestone created.",
            )
          }
        />
        {previousMilestones.length?<div className="milestone-admin-history"><h3>Completed / Previous milestones</h3>{previousMilestones.map(item=><article className="admin-record" key={item.id}><div><strong>{item.title}</strong><p>{statusLabel(item.status)}{item.archived_at?" / Archived":""}{item.completed_at?` / Completed ${new Date(item.completed_at).toLocaleDateString("en-BD")}`:""}</p></div>{item.archived_at&&item.status!=="completed"?<button type="button" disabled={pending} onClick={()=>mutate("PATCH",{kind:"milestone-archive",projectId:project.id,id:item.id,archive:false},"Milestone restored.")}>Restore to active</button>:null}</article>)}</div>:null}
      </section>
      <section>
        <header>
          <p className="eyebrow">Client communication</p>
          <h2>Updates</h2>
        </header>
        <form
          className="editor-form compact-admin-form"
          onSubmit={(event) => {
            const form = formBody(event);
            mutate(
              "POST",
              {
                kind: "update",
                projectId: project.id,
                title: form.get("title"),
                body: form.get("body"),
              },
              "Update published.",
            );
          }}
        >
          <Field name="title" label="Update title" />
          <Area name="body" label="Concise client-visible update" />
          <button disabled={pending}>Publish update</button>
        </form>
        <div className="admin-item-list">
          {updates.map((item) => (
            <article className="admin-record" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
              <button
                className="danger"
                disabled={pending}
                onClick={() =>
                  mutate(
                    "DELETE",
                    { kind: "update", projectId: project.id, id: item.id },
                    "Update removed.",
                  )
                }
              >
                Remove
              </button>
            </article>
          ))}
        </div>
      </section>
      <section>
        <header>
          <p className="eyebrow">Review and handoff</p>
          <h2>Deliverables</h2>
        </header>
        <div className="admin-item-list">
          {deliverables.map((item) => (
            <DeliverableForm
              key={item.id}
              item={item}
              pending={pending}
              save={(body) =>
                mutate(
                  "PATCH",
                  {
                    kind: "deliverable",
                    projectId: project.id,
                    id: item.id,
                    ...body,
                  },
                  "Deliverable saved.",
                )
              }
              remove={() =>
                mutate(
                  "DELETE",
                  { kind: "deliverable", projectId: project.id, id: item.id },
                  "Deliverable removed.",
                )
              }
            />
          ))}
        </div>
        <DeliverableForm
          pending={pending}
          create
          save={(body) =>
            mutate(
              "POST",
              { kind: "deliverable", projectId: project.id, ...body },
              "Deliverable created.",
            )
          }
        />
        <p className="storage-boundary">
          Use an authorized external link when delivery lives elsewhere. Private
          files are managed through the secure upload controls below.
        </p>
      </section>
      {passwordMember ? <PasswordResetDialog member={passwordMember} pending={pending} close={closePasswordDialog} reset={(password) => mutate("PATCH", { kind: "password-reset", projectId: project.id, id: passwordMember.id, password, confirmed: true }, "Client password reset.")}/> : null}
    </div>
  );
}
function PasswordResetDialog({ member, pending, close, reset }: { member: ClientProjectMember; pending: boolean; close: () => void; reset: (password: string) => Promise<boolean> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.querySelector<HTMLInputElement>("input")?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === "Escape" && !dialog?.querySelector("button:disabled")) close();
      if (event.key === "Tab" && dialog) {
        const items = [...dialog.querySelectorAll<HTMLElement>("button,input")].filter(item => !item.hasAttribute("disabled"));
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); previous?.focus(); };
  }, [close]);
  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !pending) close(); }}>
    <div ref={ref} className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="password-reset-title" aria-describedby="password-reset-copy">
      <p className="eyebrow">Account-level action</p>
      <h2 id="password-reset-title">Reset Client password?</h2>
      <p id="password-reset-copy">Set a new temporary password for <strong>{member.email}</strong>. This replaces their sign-in password across all Client Projects. The current password cannot be viewed.</p>
      <form onSubmit={async event => {
        event.preventDefault();
        setError("");
        const form = new FormData(event.currentTarget);
        const password = String(form.get("password") || "");
        const confirmation = String(form.get("confirmation") || "");
        if (password !== confirmation) { setError("The passwords do not match."); return; }
        if (form.get("acknowledge") !== "on") { setError("Confirm the account-level password change."); return; }
        if (await reset(password)) close();
      }}>
        <label>New temporary password<input name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required/></label>
        <label>Confirm temporary password<input name="confirmation" type="password" minLength={8} maxLength={128} autoComplete="new-password" required/></label>
        <label className="password-reset-confirm"><input name="acknowledge" type="checkbox" required/><span>I confirm this will replace the Client Auth account password.</span></label>
        <p className="conversion-message" role="alert">{error}</p>
        <div className="dialog-actions"><button type="button" onClick={close} disabled={pending}>Cancel</button><button className="solid-danger" disabled={pending}>{pending ? "Resetting..." : "Reset Client Password"}</button></div>
      </form>
    </div>
  </div>;
}
function MilestoneForm({
  item,
  pending,
  create = false,
  save,
  remove,
  archive,
  move,
}: {
  item?: ProjectMilestone;
  pending: boolean;
  create?: boolean;
  save: (body: Record<string, unknown>) => void;
  remove?: () => void;
  archive?: () => void;
  move?: (direction: number) => void;
}) {
  return (
    <form
      className="editor-form admin-child-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        save({
          title: form.get("title"),
          description: form.get("description"),
          status: form.get("status"),
          dueDate: form.get("dueDate"),
        });
      }}
    >
      <h3>{create ? "Create milestone" : item?.title}</h3>
      <div className="field-grid">
        <Field name="title" label="Title" value={item?.title} />
        <label>
          Status
          <select name="status" defaultValue={item?.status || "pending"}>
            {milestoneStatuses.map((value) => (
              <option value={value} key={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <Field
          name="dueDate"
          label="Due date"
          type="date"
          value={item?.due_date || ""}
        />
      </div>
      <Area name="description" label="Description" value={item?.description} />
      <div className="editor-actions">
        <button disabled={pending}>
          {create ? "Create milestone" : "Save milestone"}
        </button>
        {move ? (
          <>
            <button type="button" disabled={pending} onClick={() => move(-1)}>
              Move up
            </button>
            <button type="button" disabled={pending} onClick={() => move(1)}>
              Move down
            </button>
          </>
        ) : null}
        {remove ? (
          <button
            type="button"
            className="danger"
            disabled={pending}
            onClick={() => confirm("Permanently delete this unused pending milestone draft?") && remove()}
          >
            Delete unused draft
          </button>
        ) : null}
        {archive ? <button type="button" disabled={pending} onClick={archive}>Archive milestone</button> : null}
      </div>
    </form>
  );
}
function DeliverableForm({
  item,
  pending,
  create = false,
  save,
  remove,
}: {
  item?: ProjectDeliverable;
  pending: boolean;
  create?: boolean;
  save: (body: Record<string, unknown>) => void;
  remove?: () => void;
}) {
  return (
    <form
      className="editor-form admin-child-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        save({
          title: form.get("title"),
          description: form.get("description"),
          status: form.get("status"),
          externalUrl: form.get("externalUrl"),
        });
      }}
    >
      <h3>{create ? "Create deliverable" : item?.title}</h3>
      <div className="field-grid">
        <Field name="title" label="Title" value={item?.title} />
        <label>
          Status
          <select name="status" defaultValue={item?.status || "preparing"}>
            {deliverableStatuses.map((value) => (
              <option value={value} key={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <Field
          name="externalUrl"
          label="Authorized external URL (optional)"
          type="url"
          value={item?.external_url || ""}
          optional
        />
      </div>
      <Area name="description" label="Description" value={item?.description} />
      <div className="editor-actions">
        <button disabled={pending}>
          {create ? "Create deliverable" : "Save deliverable"}
        </button>
        {remove ? (
          <button
            type="button"
            className="danger"
            disabled={pending}
            onClick={remove}
          >
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}
function Field({
  name,
  label,
  value,
  type = "text",
  min,
  max,
  minLength,
  autoComplete,
  optional = false,
}: {
  name: string;
  label: string;
  value?: string | number;
  type?: string;
  min?: string;
  max?: string;
  minLength?: number;
  autoComplete?: string;
  optional?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        min={min}
        max={max}
        minLength={minLength}
        autoComplete={autoComplete}
        defaultValue={value ?? ""}
        required={!optional}
      />
    </label>
  );
}
function Area({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value?: string;
}) {
  return (
    <label>
      {label}
      <textarea name={name} rows={3} defaultValue={value ?? ""} required />
    </label>
  );
}
