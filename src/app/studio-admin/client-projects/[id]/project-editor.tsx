"use client";
import { FormEvent, useRef, useState } from "react";
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
    [message, setMessage] = useState("");
  async function mutate(method: string, body: unknown, success: string) {
    if (pendingRef.current) return;
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation failed.");
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
                <button
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
          {milestones.map((item, index) => (
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
              remove={() =>
                mutate(
                  "DELETE",
                  { kind: "milestone", projectId: project.id, id: item.id },
                  "Milestone removed.",
                )
              }
              move={(direction) => {
                const ids = milestones.map((value) => value.id),
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
                sortOrder: milestones.length,
                ...body,
              },
              "Milestone created.",
            )
          }
        />
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
          Phase 1D publishes authorized external links only. Private file
          uploads remain deferred until the private bucket and signed-URL flow
          are reviewed.
        </p>
      </section>
    </div>
  );
}
function MilestoneForm({
  item,
  pending,
  create = false,
  save,
  remove,
  move,
}: {
  item?: ProjectMilestone;
  pending: boolean;
  create?: boolean;
  save: (body: Record<string, unknown>) => void;
  remove?: () => void;
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
            onClick={remove}
          >
            Delete
          </button>
        ) : null}
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
