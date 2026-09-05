"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/ui/password-field";
import { ToastRegion, useToasts } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

const genericSignInError = "Email or password is incorrect.";
const genericRecoveryMessage =
  "If an account exists for that email, a password reset link has been sent.";

export function ClientAuthForm() {
  const router = useRouter();
  const pendingRef = useRef(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const { toasts, toast, dismiss } = useToasts();

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
      router.replace("/client");
      router.refresh();
    } catch {
      setMessage(genericSignInError);
      toast("error", genericSignInError);
      pendingRef.current = false;
      setPending(false);
    }
  }

  async function requestPasswordReset() {
    const normalizedEmail = email.trim().toLowerCase();
    if (pendingRef.current) return;
    if (!normalizedEmail) {
      setMessage("Enter your email address first.");
      toast("error", "Enter your email address first.");
      return;
    }
    if (!emailInputRef.current?.reportValidity()) {
      toast("error", "Enter a valid email address.");
      return;
    }

    pendingRef.current = true;
    setPending(true);
    setMessage("");

    try {
      const supabase = createClient();
      const redirectTo = `${location.origin}/client/recovery`;
      await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
      setMessage(genericRecoveryMessage);
      toast("info", genericRecoveryMessage);
    } catch {
      setMessage(genericRecoveryMessage);
      toast("info", genericRecoveryMessage);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <><form className="client-auth-form" onSubmit={submit} aria-busy={pending}>
      <label>
        Email address
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          ref={emailInputRef}
          disabled={pending}
          required
        />
      </label>
      <PasswordField
        label="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        disabled={pending}
        required
      />
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
    </form><ToastRegion toasts={toasts} dismiss={dismiss} /></>
  );
}

export function ClientLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const { toasts, toast, dismiss } = useToasts();

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
      router.replace("/client");
      router.refresh();
    } catch (error) {
      const failure = error instanceof Error
        ? error.message
        : "Sign-out could not be confirmed. Please retry.";
      setMessage(failure);
      toast("error", failure);
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
      <ToastRegion toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
