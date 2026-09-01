"use client";

import { FormEvent, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const genericSignInError =
  "Secure access could not be sent. Confirm this email has Client Project access and try again.";

export function ClientAuthForm({
  initialMessage = "",
}: {
  initialMessage?: string;
}) {
  const pendingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(initialMessage);

  async function requestAccess(resend = false) {
    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${location.origin}/client/auth/callback`,
      },
    });
    if (error) throw new Error(genericSignInError);

    setEmail(normalizedEmail);
    setSent(true);
    setMessage(resend ? "Secure access resent." : "");
  }

  async function runRequest(resend = false) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setMessage("");
    try {
      await requestAccess(resend);
    } catch {
      setMessage(
        resend ? "The secure access email could not be resent." : genericSignInError,
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runRequest();
  }

  function anotherEmail() {
    setSent(false);
    setMessage("");
  }

  return (
    <form className="client-auth-form" onSubmit={submit}>
      {sent ? (
        <div className="client-sent-state">
          <p className="eyebrow">Secure access sent</p>
          <h2>Check your email.</h2>
          <p>
            We sent a secure sign-in link to <strong>{email}</strong>.
            <br />
            Open the email and choose Sign in.
          </p>
        </div>
      ) : (
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
      )}
      <p className="client-form-note" aria-live="polite">
        {message ||
          (!sent
            ? "Access is available only to email addresses assigned to a Client Project."
            : "The link opens this secure workspace and expires automatically.")}
      </p>
      {!sent ? (
        <button className="action action-solid" disabled={pending}>
          {pending ? "Please wait..." : "Email secure access"}
        </button>
      ) : (
        <div className="client-auth-actions">
          <button
            className="client-text-button"
            type="button"
            disabled={pending}
            onClick={() => void runRequest(true)}
          >
            Resend email
          </button>
          <button
            className="client-text-button"
            type="button"
            disabled={pending}
            onClick={anotherEmail}
          >
            Use another email
          </button>
        </div>
      )}
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
