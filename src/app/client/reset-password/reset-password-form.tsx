"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";

import { PasswordField } from "@/components/ui/password-field";
import { RecoveryRequestForm } from "./recovery-request-form";

const minimumPasswordLength = 8;
const maximumPasswordLength = 128;

export function ResetPasswordForm() {
  const pendingRef = useRef(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;

    if (
      password.length < minimumPasswordLength ||
      password.length > maximumPasswordLength
    ) {
      setMessage(
        `Use a password between ${minimumPasswordLength} and ${maximumPasswordLength} characters.`,
      );
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
      const response = await fetch("/client/auth/recovery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (response.status === 401) {
        setUnavailable(true);
        return;
      }
      if (!response.ok) {
        throw new Error(
          result.error ?? "We couldn't update your password. Please try again.",
        );
      }

      setComplete(true);
      setMessage("Password updated. You can now return to your workspace.");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We couldn't update your password. Please try again.",
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  if (unavailable) {
    return (
      <div className="client-sent-state" role="alert">
        <h2>This recovery link is no longer available.</h2>
        <RecoveryRequestForm />
      </div>
    );
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
      <PasswordField
        label="New password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="new-password"
        minLength={minimumPasswordLength}
        maxLength={maximumPasswordLength}
        disabled={pending}
        required
      />
      <PasswordField
        label="Confirm new password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        autoComplete="new-password"
        minLength={minimumPasswordLength}
        maxLength={maximumPasswordLength}
        disabled={pending}
        required
      />
      <p className="client-form-note" aria-live="polite">
        {message ||
          `Use ${minimumPasswordLength} to ${maximumPasswordLength} characters.`}
      </p>
      <button className="action action-solid" disabled={pending}>
        {pending ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}
