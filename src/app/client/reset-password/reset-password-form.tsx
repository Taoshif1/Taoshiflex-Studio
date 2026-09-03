"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const minimumPasswordLength = 8;
type RecoveryState = "invalid" | "expired";

export function ResetPasswordForm({
  hasSession,
  recoveryState,
}: {
  hasSession: boolean;
  recoveryState?: RecoveryState;
}) {
  const pendingRef = useRef(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);

  if (recoveryState || !hasSession) {
    return (
      <div className="client-sent-state" role="alert">
        <p className="eyebrow">Recovery link unavailable</p>
        <h2>Request a new link.</h2>
        <p>
          This recovery link is{" "}
          {recoveryState === "expired" ? "expired" : "missing or invalid"}.
        </p>
        <Link className="action action-solid" href="/client">
          Return to Client Access
        </Link>
      </div>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;

    if (password.length < minimumPasswordLength) {
      setMessage(`Use at least ${minimumPasswordLength} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    pendingRef.current = true;
    setPending(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        throw new Error("This recovery link is missing, invalid, or expired. Request a new one from Client Access.");
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setComplete(true);
      setMessage("Password updated. You can now return to your workspace.");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Password could not be updated. Request a new recovery link and try again.",
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  if (complete) {
    return (
      <div className="client-sent-state" role="status">
        <p className="eyebrow">Password updated</p>
        <h2>Access restored.</h2>
        <p>{message}</p>
        <Link className="action action-solid" href="/client">
          Return to Client Workspace
        </Link>
      </div>
    );
  }

  return (
    <form className="client-auth-form" onSubmit={submit} aria-busy={pending}>
      <label>
        New password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={minimumPasswordLength}
          disabled={pending}
          required
        />
      </label>
      <label>
        Confirm new password
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          minLength={minimumPasswordLength}
          disabled={pending}
          required
        />
      </label>
      <p className="client-form-note" aria-live="polite">
        {message || `Use at least ${minimumPasswordLength} characters.`}
      </p>
      <button className="action action-solid" disabled={pending}>
        {pending ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}
