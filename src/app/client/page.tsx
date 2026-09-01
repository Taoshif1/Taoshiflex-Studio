import Link from "next/link";
import { getClientAuthorization } from "@/lib/client-auth";
import {
  formatProjectDate,
  statusLabel,
  type ClientProject,
} from "@/lib/client-projects";
import { supabaseRest } from "@/lib/supabase-rest";
import { ClientAuthForm, ClientLogout } from "./client-auth-form";

type Props = {
  searchParams: Promise<{ auth_error?: string | string[] }>;
};

const authErrorMessages: Record<string, string> = {
  callback_code_missing:
    "This secure sign-in link is incomplete. Request a fresh email and try again.",
  code_exchange_failed:
    "This secure sign-in link is invalid, expired, or was opened in a different browser. Request a fresh email and try again.",
  session_validation_failed:
    "Your sign-in could not be verified. Request a fresh secure access email.",
};

export default async function ClientPage({ searchParams }: Props) {
  const authorization = await getClientAuthorization();
  if (!authorization) {
    const rawAuthError = (await searchParams).auth_error;
    const authError = Array.isArray(rawAuthError)
      ? rawAuthError[0]
      : rawAuthError;
    return (
      <main className="client-shell client-login">
        <section className="client-login-panel">
          <p className="eyebrow">Private / Client workspace</p>
          <h1>Welcome back.</h1>
          <p>
            Use the email connected to your project. Your reference identifies
            the work, but it never grants access.
          </p>
          <ClientAuthForm
            initialMessage={
              authError ? authErrorMessages[authError] : undefined
            }
          />
          <aside>
            <strong>Magic Link access</strong>
            <span>
              Supabase sends a secure sign-in link. Open it in the same browser
              that requested access so the protected PKCE exchange can finish.
              No password is stored by Taoshiflex Studio.
            </span>
          </aside>
        </section>
      </main>
    );
  }
  const projects = await supabaseRest<ClientProject[]>(
    "client_projects?select=id,reference,name,client_name,summary,status,progress,current_phase,next_action,start_date,target_date,created_at,updated_at&order=updated_at.desc",
    {},
    { userAccessToken: authorization.token },
  ).catch(() => null);
  if (projects === null)
    return <WorkspaceUnavailable email={authorization.user.email} />;
  const active = projects.filter(
      (item) => !["completed", "cancelled"].includes(item.status),
    ),
    completed = projects.filter((item) => item.status === "completed");
  return (
    <main className="client-shell">
      <header className="client-head">
        <div>
          <p className="eyebrow">Private / Client workspace</p>
          <h1>
            Welcome
            {authorization.user.email
              ? `, ${authorization.user.email.split("@")[0]}`
              : ""}
            .
          </h1>
          <p>
            A clear view of accepted work, current decisions and what happens
            next.
          </p>
        </div>
        <ClientLogout />
      </header>
      <ProjectGroup title="Active projects" projects={active} />
      <ProjectGroup title="Completed projects" projects={completed} />
      {!projects.length ? (
        <section className="client-empty">
          <h2>No projects assigned yet.</h2>
          <p>
            Your account is authenticated, but it is not currently a member of a
            Client Project. Ask the Studio to confirm membership.
          </p>
        </section>
      ) : null}
    </main>
  );
}
function ProjectGroup({
  title,
  projects,
}: {
  title: string;
  projects: ClientProject[];
}) {
  if (!projects.length) return null;
  return (
    <section className="client-project-group">
      <div className="client-section-title">
        <p className="eyebrow">Delivery</p>
        <h2>{title}</h2>
      </div>
      <div className="client-project-grid">
        {projects.map((project) => (
          <Link
            className="client-project-card"
            href={`/client/projects/${project.id}`}
            key={project.id}
          >
            <div>
              <span className={`client-status ${project.status}`}>
                {statusLabel(project.status)}
              </span>
              <span className="technical">{project.reference}</span>
            </div>
            <h3>{project.name}</h3>
            <p>{project.summary || "Project delivery workspace"}</p>
            <dl>
              <div>
                <dt>Current phase</dt>
                <dd>{project.current_phase}</dd>
              </div>
              <div>
                <dt>Target</dt>
                <dd>{formatProjectDate(project.target_date)}</dd>
              </div>
              <div>
                <dt>Next action</dt>
                <dd>
                  {project.next_action ||
                    "The Studio will post the next action here."}
                </dd>
              </div>
            </dl>
            <div className="progress-label">
              <span>Overall progress</span>
              <strong>{project.progress}%</strong>
            </div>
            <div
              className="client-progress"
              role="progressbar"
              aria-label={`${project.name} overall progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={project.progress}
            >
              <i style={{ width: `${project.progress}%` }} />
            </div>
            <span className="client-card-link">Open workspace →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
function WorkspaceUnavailable({ email }: { email?: string }) {
  return (
    <main className="client-shell client-login">
      <section className="client-login-panel">
        <p className="eyebrow">Private / Client workspace</p>
        <h1>Workspace setup pending.</h1>
        <p>
          {email ? `You are signed in as ${email}. ` : ""}The Client Workspace
          database has not been activated yet. No private project data was
          exposed.
        </p>
        <ClientLogout />
      </section>
    </main>
  );
}
