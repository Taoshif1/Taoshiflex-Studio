import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="client-shell client-login">
      <section className="client-login-panel">
        <p className="eyebrow">Private / Client workspace</p>
        <h1>Reset Password</h1>
        <p>Choose a new password for your client account.</p>
        <ResetPasswordForm />
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
