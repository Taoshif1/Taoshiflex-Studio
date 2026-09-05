import type { ClientWorkspaceMaintenance } from "@/lib/client-workspace-maintenance-contract";

export function ClientMaintenanceBanner({
  maintenance,
}: {
  maintenance: ClientWorkspaceMaintenance;
}) {
  if (!maintenance.enabled) return null;
  return (
    <aside className="client-maintenance-banner" role="status">
      <p className="eyebrow">Client Workspace / Read-only maintenance</p>
      <strong>Project information remains available.</strong>
      <p>{maintenance.message}</p>
    </aside>
  );
}
