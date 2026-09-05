"use client";

import { FormEvent, useState } from "react";

import {
  normalizeClientWorkspaceMaintenance,
  type ClientWorkspaceMaintenance,
} from "@/lib/client-workspace-maintenance-contract";

export function WorkspaceMaintenanceForm({
  value,
  pending,
  submit,
}: {
  value: unknown;
  pending: boolean;
  submit: (value: ClientWorkspaceMaintenance) => void;
}) {
  const initial = normalizeClientWorkspaceMaintenance(value);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [confirmed, setConfirmed] = useState(initial.enabled);
  const needsConfirmation = enabled && !initial.enabled;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (needsConfirmation && !confirmed) return;
    const form = new FormData(event.currentTarget);
    submit({
      enabled,
      message: String(form.get("message") ?? "").trim(),
    });
  }

  return (
    <form className="editor-form maintenance-form" onSubmit={onSubmit}>
      <div className="maintenance-state">
        <span className={enabled ? "is-maintenance" : "is-normal"} aria-hidden />
        <div>
          <p className="eyebrow">Current selection</p>
          <strong>{enabled ? "READ-ONLY MAINTENANCE" : "NORMAL"}</strong>
          <p>
            {enabled
              ? "Clients can read project information and download deliverables, but project feedback and new payment submissions are paused."
              : "The Client Workspace remains fully interactive."}
          </p>
        </div>
      </div>
      <label className="maintenance-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked);
            setConfirmed(initial.enabled || !event.target.checked);
          }}
        />
        <span>
          <strong>Read-only Client Workspace</strong>
          <small>The public website, Assistant, inquiries, Client login, downloads, and Studio Admin remain available.</small>
        </span>
      </label>
      <label>
        Client maintenance message
        <textarea
          name="message"
          rows={4}
          minLength={20}
          maxLength={400}
          defaultValue={initial.message}
          required
        />
      </label>
      {needsConfirmation ? (
        <label className="maintenance-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          I understand that Client feedback, approvals, change requests, and new payment submissions will pause until maintenance is disabled.
        </label>
      ) : null}
      <button disabled={pending || (needsConfirmation && !confirmed)}>
        {pending ? "Saving..." : "Save maintenance setting"}
      </button>
    </form>
  );
}
