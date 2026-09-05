import "./feedback-layout.css";
import "./feedback.css";
import "../../../project-timeline.css";
import Link from "next/link";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { getClientWorkspaceMaintenance } from "@/lib/client-workspace-maintenance";
import { loadNotificationInbox } from "@/lib/notifications";
import { loadClientProject } from "@/lib/client-workspace";
import { statusLabel } from "@/lib/client-projects";
import { ClientMaintenanceBanner } from "../../client-maintenance-banner";
import { ProjectSubnav } from "./project-subnav";

export default async function ClientProjectLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const { authorization, access, project } = await loadClientProject(id);
  const [inbox, maintenance] = await Promise.all([
    loadNotificationInbox(authorization.user.id, access),
    getClientWorkspaceMaintenance(),
  ]);

  return (
    <main className="client-shell project-workspace">
      <header className="workspace-head">
        <Link href="/client">All projects</Link>
        <div>
          <p className="eyebrow">{project.reference} / Client Project</p>
          <h1>{project.name}</h1>
          <p>{project.summary}</p>
        </div>
        <div className="workspace-head-actions">
          <Link className="action" href="/client/help">Help</Link>
          <NotificationCenter inbox={inbox}/>
          <span className={`client-status ${project.status}`}>{statusLabel(project.status)}</span>
        </div>
      </header>
      <ClientMaintenanceBanner maintenance={maintenance}/>
      <ProjectSubnav projectId={id}/>
      {children}
    </main>
  );
}
