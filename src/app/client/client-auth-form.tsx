"use client";

import { FormEvent, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const genericSignInError = "Email or password is incorrect.";
const genericRecoveryMessage =
  "If an account exists for that email, a password reset link has been sent.";

export function ClientAuthForm() {
  const pendingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error || !data.session) throw new Error(genericSignInError);
      location.assign("/client");
    } catch {
      setMessage(genericSignInError);
      pendingRef.current = false;
      setPending(false);
    }
  }

  async function requestPasswordReset() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || pendingRef.current) {
      setMessage("Enter your email address first.");
      return;
    }

    pendingRef.current = true;
    setPending(true);
    setMessage("");

    try {
      const supabase = createClient();
      const redirectTo = `${location.origin}/client/auth/callback`;
      await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
      setMessage(genericRecoveryMessage);
    } catch {
      setMessage(genericRecoveryMessage);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <form className="client-auth-form" onSubmit={submit}>
      <label>
        Email address
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          disabled={pending}
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          disabled={pending}
          required
        />
      </label>
      <p className="client-form-note" aria-live="polite">
        {message || "Enter the credentials connected to your project."}
      </p>
      <button className="action action-solid" disabled={pending}>
        {pending ? "Working..." : "Sign In"}
      </button>
      <button
        className="client-recovery-button"
        type="button"
        disabled={pending}
        onClick={requestPasswordReset}
      >
        Forgot password?
      </button>
    </form>
  );
}

export function ClientLogout() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function logout() {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/client/auth", { method: "DELETE" });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          result.error || "Sign-out could not be confirmed. Please retry.",
        );
      location.assign("/client");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Sign-out could not be confirmed. Please retry.",
      );
      setPending(false);
    }
  }

  return (
    <div>
      <button className="client-logout" disabled={pending} onClick={logout}>
        {pending ? "Signing out..." : "Sign out"}
      </button>
      {message ? (
        <p className="client-form-note" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
