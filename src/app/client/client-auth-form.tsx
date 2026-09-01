"use client";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

async function authRequest(body: unknown) {
  const response = await fetch("/api/client/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    result = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok)
    throw new Error(result.error || "Sign-in could not be completed.");
}
export function ClientAuthForm() {
  const router = useRouter(),
    pendingRef = useRef(false),
    [email, setEmail] = useState(""),
    [sent, setSent] = useState(false),
    [showCode, setShowCode] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  async function requestAccess(resend = false) {
    await authRequest({ action: "request", email });
    setSent(true);
    setMessage(resend ? "Secure access resent." : "");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      if (!sent) {
        await requestAccess();
      } else if (showCode) {
        await authRequest({
          action: "verify",
          email,
          token: String(form.get("token") ?? "").trim(),
        });
        router.refresh();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Sign-in could not be completed.",
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }
  async function resend() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setMessage("");
    try {
      await requestAccess(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The email could not be resent.",
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }
  function anotherEmail() {
    setSent(false);
    setShowCode(false);
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
      {sent && showCode ? (
        <label>
          One-time code
          <input
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            minLength={6}
            maxLength={12}
            disabled={pending}
            required
            autoFocus
          />
        </label>
      ) : null}
      <p className="client-form-note" aria-live="polite">
        {message ||
          (!sent
            ? "Access is available only to email addresses assigned to a Client Project."
            : showCode
              ? "Enter the code only if your email provided one instead of a sign-in link."
              : "The link opens this secure workspace and expires automatically.")}
      </p>
      {!sent || showCode ? (
        <button className="action action-solid" disabled={pending}>
          {pending
            ? "Please wait…"
            : showCode
              ? "Verify and continue"
              : "Email secure access"}
        </button>
      ) : null}
      {sent ? (
        <div className="client-auth-actions">
          <button className="client-text-button" type="button" disabled={pending} onClick={resend}>
            Resend email
          </button>
          <button className="client-text-button" type="button" disabled={pending} onClick={anotherEmail}>
            Use another email
          </button>
          {!showCode ? (
            <button className="client-code-button" type="button" disabled={pending} onClick={() => { setShowCode(true); setMessage(""); }}>
              I received a code instead
            </button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
export function ClientLogout() {
  async function logout() {
    await fetch("/api/client/auth", { method: "DELETE" });
    location.href = "/client";
  }
  return (
    <button className="client-logout" onClick={logout}>
      Sign out
    </button>
  );
}
