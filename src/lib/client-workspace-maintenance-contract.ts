export const CLIENT_WORKSPACE_MAINTENANCE_KEY = "client_workspace_maintenance";
export const CLIENT_WORKSPACE_MAINTENANCE_MESSAGE =
  "The Client Workspace is temporarily in read-only maintenance. Project information remains available, but payments and feedback/actions are paused.";
export const CLIENT_WORKSPACE_MAINTENANCE_ERROR =
  "The Client Workspace is temporarily read-only during maintenance.";

export type ClientWorkspaceMaintenance = {
  enabled: boolean;
  message: string;
};

export const clientWorkspaceMaintenanceDefaults: ClientWorkspaceMaintenance = {
  enabled: false,
  message: CLIENT_WORKSPACE_MAINTENANCE_MESSAGE,
};

function plainMessage(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeClientWorkspaceMaintenance(
  value: unknown,
): ClientWorkspaceMaintenance {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...clientWorkspaceMaintenanceDefaults };
  }
  const input = value as Record<string, unknown>;
  const message = plainMessage(input.message).slice(0, 400);
  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : false,
    message: message || CLIENT_WORKSPACE_MAINTENANCE_MESSAGE,
  };
}

export function parseClientWorkspaceMaintenance(
  value: unknown,
): ClientWorkspaceMaintenance | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.enabled !== "boolean" || typeof input.message !== "string") {
    return null;
  }
  const message = plainMessage(input.message);
  if (!message || message.length > 400) return null;
  return { enabled: input.enabled, message };
}

export function clientWorkspaceMaintenanceResponse() {
  return Response.json(
    {
      error: CLIENT_WORKSPACE_MAINTENANCE_ERROR,
      code: "workspace_maintenance",
    },
    { status: 503 },
  );
}
