"use client";

import { FormEvent, useState } from "react";

import {
  normalizeStudioAlertSettings,
  type StudioAlertSettings,
} from "@/lib/studio-alert-settings";

type InquiryAlertSettingsProps = {
  value: unknown;
  readiness: { email: boolean };
  pending: Set<string>;
  save: (value: StudioAlertSettings) => void;
  test: (channel: "email") => void;
};

export function InquiryAlertSettings({
  value,
  readiness,
  pending,
  save,
  test,
}: InquiryAlertSettingsProps) {
  const initial = normalizeStudioAlertSettings(value);
  const [emailEnabled, setEmailEnabled] = useState(initial.emailEnabled);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save({
      emailEnabled,
      emailTo: String(form.get("emailTo") ?? "").trim(),
    });
  }

  return (
    <form className="editor-form inquiry-alert-settings" onSubmit={submit}>
      <div className="alert-channel">
        <div className="alert-channel-head">
          <div>
            <p className="eyebrow">Email alerts</p>
            <h3>New inquiry email</h3>
          </div>
          <span className={readiness.email ? "configured" : "missing"}>
            {readiness.email ? "Provider configured" : "Missing SMTP configuration"}
          </span>
        </div>
        <label>
          Recipient email
          <input
            name="emailTo"
            type="email"
            maxLength={254}
            autoComplete="email"
            defaultValue={initial.emailTo}
            required
          />
        </label>
        <label className="presence-enabled">
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(event) => setEmailEnabled(event.target.checked)}
          />
          Send an email after a new inquiry is safely stored
        </label>
        <button
          type="button"
          disabled={!readiness.email || pending.has("alert-test:email")}
          onClick={() => test("email")}
        >
          {pending.has("alert-test:email") ? "Sending test..." : "Send test email"}
        </button>
      </div>
      <p className="alert-settings-note">
        Save recipient changes before sending a test. Alert delivery is best-effort; a
        provider problem never removes or rejects a saved inquiry.
      </p>
      <button disabled={pending.has("studio-alerts")}>
        {pending.has("studio-alerts") ? "Saving..." : "Save Inquiry Alerts"}
      </button>
    </form>
  );
}
