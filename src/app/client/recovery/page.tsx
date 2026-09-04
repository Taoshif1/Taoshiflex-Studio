import type { Metadata } from "next";

import { RecoveryRequestForm } from "@/app/client/reset-password/recovery-request-form";

export const metadata: Metadata = {
  title: "Confirm password recovery",
  robots: { index: false, follow: false },
};

type RecoveryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientRecoveryPage({
  searchParams,
}: RecoveryPageProps) {
  const params = await searchParams;
  const tokenHash =
    typeof params.token_hash === "string" ? params.token_hash.trim() : "";
  const isRecovery =
    params.type === "recovery" &&
    tokenHash.length >= 32 &&
    tokenHash.length <= 512;

  return (
    <main className="client-shell client-login">
      <section className="client-login-panel" aria-labelledby="recovery-title">
        <p className="eyebrow">Private / Client workspace</p>
        <h1 id="recovery-title">
          {isRecovery
            ? "Confirm password recovery"
            : "This recovery link is invalid."}
        </h1>
        <p>
          {isRecovery
            ? "Continue when you are ready to choose a new password. This extra step keeps email previews from using your one-time link."
            : "The link is incomplete or was changed. Request a fresh password reset below."}
        </p>

        {isRecovery ? (
          <form
            className="client-auth-form"
            action="/client/auth/recovery"
            method="post"
          >
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value="recovery" />
            <button className="action action-solid" type="submit">
              Continue securely
            </button>
          </form>
        ) : (
          <RecoveryRequestForm />
        )}
      </section>
    </main>
  );
}
