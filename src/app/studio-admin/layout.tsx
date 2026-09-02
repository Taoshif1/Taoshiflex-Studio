import "./studio-admin.css";
import "./phase1c1-admin.css";
import "./phase1d-admin.css";
import { getAdminAuthorization } from "@/lib/supabase-rest";
import { AdminNavigation } from "./admin-navigation";
import { loadNotificationInbox } from "@/lib/notifications";
import "@/components/notifications/notification-center.css";

export default async function StudioAdminLayout({ children }: { children: React.ReactNode }) {
  const authorization = await getAdminAuthorization();
  if (!authorization) return children;
  const user = authorization.user;
  const notifications = await loadNotificationInbox(user.id, { userAccessToken: authorization.token });
  return <div className="admin-app-shell">
    <AdminNavigation email={user.email} inbox={notifications}/>
    <div className="admin-app-content">{children}</div>
  </div>;
}
