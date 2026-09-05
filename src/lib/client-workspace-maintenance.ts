import "server-only";

import { cache } from "react";

import {
  CLIENT_WORKSPACE_MAINTENANCE_KEY,
  clientWorkspaceMaintenanceDefaults,
  clientWorkspaceMaintenanceResponse,
  normalizeClientWorkspaceMaintenance,
} from "@/lib/client-workspace-maintenance-contract";
import { supabaseRest } from "@/lib/supabase-rest";

async function loadClientWorkspaceMaintenance() {
  const rows = await supabaseRest<Array<{ value?: unknown }>>(
    `site_settings?key=eq.${CLIENT_WORKSPACE_MAINTENANCE_KEY}&public=eq.false&select=value&limit=1`,
    {},
    "privileged",
  );
  return normalizeClientWorkspaceMaintenance(rows[0]?.value);
}

export const getClientWorkspaceMaintenance = cache(async () => {
  try {
    return await loadClientWorkspaceMaintenance();
  } catch {
    return { ...clientWorkspaceMaintenanceDefaults };
  }
});

export async function requireClientWorkspaceWritable() {
  try {
    const maintenance = await loadClientWorkspaceMaintenance();
    return maintenance.enabled ? clientWorkspaceMaintenanceResponse() : null;
  } catch {
    return clientWorkspaceMaintenanceResponse();
  }
}
