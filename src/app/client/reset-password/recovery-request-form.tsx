"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function RecoveryRequestForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] =
    useState<"idle" | "sending" | "sent">("idle");

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    try {
      const supabase = createClient();
      const redirectTo = window.location.origin + "/client/recovery";
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      });
    } catch {
      // Keep the response generic so account existence is never disclosed.
    }

    setStatus("sent");
  }

  return (
    <form className="client-auth-form" onSubmit={requestReset}>
      <label htmlFor="recovery-email">Client email</label>
      <input
        id="recovery-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <button
        className="action action-solid"
        type="submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending..." : "Request a new password reset"}
      </button>
      <p className="client-form-note" role="status" aria-live="polite">
        {status === "sent"
          ? "If a Client account matches that email, a new recovery link is on its way."
          : "For privacy, the response is the same whether or not an account exists."}
      </p>
    </form>
  );
}
