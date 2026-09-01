"use client";

import { FormEvent, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const genericSendError =
  "The access code could not be sent. Please wait and try again.";
const invalidCodeError =
  "That code is invalid or expired. Request a new one.";

export function ClientAuthForm() {
  const pendingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function requestAccess(resend = false) {
    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    });
    if (error) throw new Error(genericSendError);

    setEmail(normalizedEmail);
    setSent(true);
    setCode("");
    setMessage(resend ? "A new access code was sent." : "");
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
        resend
          ? "The access code could not be resent. Please wait and try again."
          : genericSendError,
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sent) {
      await runRequest();
      return;
    }
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      if (error || !data.session) throw new Error(invalidCodeError);
      location.assign("/client");
    } catch {
      setMessage(invalidCodeError);
      pendingRef.current = false;
      setPending(false);
    }
  }

  function anotherEmail() {
    setSent(false);
    setCode("");
    setMessage("");
  }

  return (
    <form className="client-auth-form" onSubmit={submit}>
      {sent ? (
        <div className="client-sent-state">
          <p className="eyebrow">Client Access</p>
          <h2>Check your email.</h2>
          <p>
            We sent a one-time access code to <strong>{email}</strong>.
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
      {sent ? (
        <label>
          One-time code
          <input
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            minLength={6}
            maxLength={8}
            disabled={pending}
            required
            autoFocus
          />
        </label>
      ) : null}
      <p className="client-form-note" aria-live="polite">
        {message ||
          (!sent
            ? "Enter the email connected to your project."
            : "Enter the one-time code we sent.")}
      </p>
      <button className="action action-solid" disabled={pending}>
        {pending
          ? "Please wait..."
          : sent
            ? "Access project"
            : "Send access code"}
      </button>
      {sent ? (
        <div className="client-auth-actions">
          <button
            className="client-text-button"
            type="button"
            disabled={pending}
            onClick={() => void runRequest(true)}
          >
            Resend code
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
      ) : null}
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
