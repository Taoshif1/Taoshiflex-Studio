import { RecoveryRequestForm } from "./recovery-request-form";
import { ResetPasswordForm } from "./reset-password-form";

import { hasRecoveryIntent } from "@/lib/client-recovery";
import { createClient } from "@/lib/supabase/server";

type RecoveryState = "valid" | "invalid" | "unavailable" | "failure";

const recoveryCopy: Record<
  Exclude<RecoveryState, "valid">,
  { title: string; description: string }
> = {
  invalid: {
    title: "This recovery link is invalid.",
    description: "The link is incomplete or was changed.",
  },
  unavailable: {
    title: "This recovery link is no longer available.",
    description: "It may have expired or already been used.",
  },
  failure: {
    title: "We couldn't verify this recovery link.",
    description: "Please request a new password reset and try again.",
  },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ recovery?: string }>;
}) {
  const { recovery } = await searchParams;
  let state: RecoveryState =
    recovery === "invalid"
      ? "invalid"
      : recovery === "expired"
        ? "unavailable"
        : recovery === "failure"
          ? "failure"
          : "invalid";

  if (recovery === "verified") {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      state =
        !error &&
        data.user &&
        (await hasRecoveryIntent(data.user.id))
          ? "valid"
          : "unavailable";
    } catch {
      state = "failure";
    }
  }

  const copy = state === "valid" ? null : recoveryCopy[state];

  return (
    <main className="client-shell client-login">
      <section className="client-login-panel" aria-labelledby="reset-title">
        <p className="eyebrow">Private / Client workspace</p>
        <h1 id="reset-title">
          {state === "valid" ? "Choose a new password" : copy?.title}
        </h1>
        <p>
          {state === "valid"
            ? "Set a new password for your client account."
            : copy?.description}
        </p>
        {state === "valid" ? <ResetPasswordForm /> : <RecoveryRequestForm />}
      </section>
    </main>
  );
}
