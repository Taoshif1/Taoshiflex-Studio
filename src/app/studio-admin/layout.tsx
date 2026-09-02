import "./studio-admin.css";
import "./phase1c1-admin.css";
import "./phase1d-admin.css";
import { getAdminSession } from "@/lib/supabase-rest";
import { AdminNavigation } from "./admin-navigation";

export default async function StudioAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminSession();
  if (!user) return children;
  return <div className="admin-app-shell">
    <AdminNavigation email={user.email}/>
    <div className="admin-app-content">{children}</div>
  </div>;
}
