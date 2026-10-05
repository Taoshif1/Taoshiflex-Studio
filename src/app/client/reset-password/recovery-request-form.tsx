"use client";

import { PendingButton } from "@/components/ui/loading";
import { useToasts } from "@/components/ui/toast";
import { useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function RecoveryRequestForm() {
  const { toast } = useToasts();
  const busy = useRef(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] =
    useState<"idle" | "sending" | "sent">("idle");

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
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

    busy.current = false;
    setStatus("sent");
    toast("info", "If a Client account matches that email, a recovery link has been requested.");
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
      <PendingButton pending={status === "sending"} pendingLabel="Sending…"
        className="action action-solid"
        type="submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending..." : "Request a new password reset"}
      </PendingButton>
      <p className="client-form-note" role="status" aria-live="polite">
        {status === "sent"
          ? "If a Client account matches that email, a new recovery link is on its way."
          : "For privacy, the response is the same whether or not an account exists."}
      </p>
    </form>
  );
}
