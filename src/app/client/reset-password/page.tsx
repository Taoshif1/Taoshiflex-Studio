import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

type RecoveryState = "invalid" | "expired";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ recovery?: string }>;
}) {
  const { recovery } = await searchParams;
  const recoveryState: RecoveryState | undefined =
    recovery === "invalid" || recovery === "expired" ? recovery : undefined;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const hasSession = !error && Boolean(data?.claims);
  return (
    <main className="client-shell client-login">
      <section className="client-login-panel">
        <p className="eyebrow">Private / Client workspace</p>
        <h1>Reset Password</h1>
        <p>Choose a new password for your client account.</p>
        <ResetPasswordForm
          hasSession={hasSession}
          recoveryState={recoveryState}
        />
        <aside>
          <strong>Opened this page by mistake?</strong>
          <span>
            <Link href="/client">Return to Client Access</Link>
          </span>
        </aside>
      </section>
    </main>
  );
}
