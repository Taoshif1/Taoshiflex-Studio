import type { ProjectDeliverable } from "@/lib/client-projects";

export function DeliverableActions({ deliverable }: { deliverable: ProjectDeliverable }) {
  if (!deliverable.storage_path && !deliverable.external_url) {
    return <span className="deliverable-pending">No file or link published</span>;
  }

  return (
    <div className="deliverable-actions">
      {deliverable.storage_path ? (
        <a className="action action-solid" href={`/api/client/deliverables/${deliverable.id}/download`}>
          Download private file ↓
        </a>
      ) : null}
      {deliverable.external_url ? (
        <a className="action" href={deliverable.external_url} target="_blank" rel="noreferrer">
          Open external link ↗
        </a>
      ) : null}
    </div>
  );
}
