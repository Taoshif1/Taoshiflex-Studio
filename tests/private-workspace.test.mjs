import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  CLIENT_WORKSPACE_MAINTENANCE_ERROR,
  clientWorkspaceMaintenanceDefaults,
  clientWorkspaceMaintenanceResponse,
  normalizeClientWorkspaceMaintenance,
  parseClientWorkspaceMaintenance,
} from "../src/lib/client-workspace-maintenance-contract.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("maintenance defaults are safe and disabled", () => {
  assert.equal(clientWorkspaceMaintenanceDefaults.enabled, false);
  assert.match(clientWorkspaceMaintenanceDefaults.message, /read-only maintenance/i);
});

test("maintenance values are normalized as bounded plain text", () => {
  const normalized = normalizeClientWorkspaceMaintenance({
    enabled: true,
    message: "  Planned\nmaintenance\u0000 window  ",
  });
  assert.deepEqual(normalized, { enabled: true, message: "Planned maintenance window" });
  assert.equal(normalizeClientWorkspaceMaintenance({}).enabled, false);
});

test("maintenance writes require a valid explicit shape", () => {
  assert.equal(parseClientWorkspaceMaintenance({ enabled: "yes", message: "No" }), null);
  assert.equal(parseClientWorkspaceMaintenance({ enabled: true, message: "" }), null);
  assert.deepEqual(parseClientWorkspaceMaintenance({
    enabled: false,
    message: "Client actions are available.",
  }), { enabled: false, message: "Client actions are available." });
});

test("maintenance response is stable and provider-neutral", async () => {
  const response = clientWorkspaceMaintenanceResponse();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: CLIENT_WORKSPACE_MAINTENANCE_ERROR,
    code: "workspace_maintenance",
  });
});

test("both Client mutation endpoints enforce the reusable server guard", () => {
  for (const path of [
    "src/app/api/client/feedback/route.ts",
    "src/app/api/client/payments/route.ts",
  ]) {
    const source = read(path);
    assert.match(source, /requireClientWorkspaceWritable/);
    assert.match(source, /if\s*\(maintenance\)\s*return maintenance/);
  }
});

test("maintenance setting remains private in existing site settings", () => {
  const source = read("src/app/api/studio/settings/route.ts");
  assert.match(source, /CLIENT_WORKSPACE_MAINTENANCE_KEY/);
  assert.match(source, /public:false/);
  assert.doesNotMatch(source, /NEXT_PUBLIC/);
});

test("Client Project sections are real routes with shared authorization", () => {
  for (const section of ["timeline", "milestones", "updates", "deliverables", "billing", "feedback"]) {
    const path = `src/app/client/projects/[id]/${section}/page.tsx`;
    assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), true, path);
    assert.match(read(path), /loadClientProject\(id\)/);
  }
  const loader = read("src/lib/client-workspace.ts");
  assert.match(loader, /userAccessToken/);
  assert.match(loader, /getClientAuthorization/);
  assert.doesNotMatch(loader, /privileged/);
});

test("Admin navigation uses real routes and legacy hashes redirect safely", () => {
  const navigation = read("src/app/studio-admin/admin-navigation.tsx");
  assert.doesNotMatch(navigation, /studio-admin#/);
  for (const route of ["/studio-admin/projects", "/studio-admin/pricing", "/studio-admin/github", "/studio-admin/settings"]) {
    assert.equal(navigation.includes(route), true, route);
  }
  const legacy = read("src/app/studio-admin/admin-legacy-hash-redirect.tsx");
  assert.match(legacy, /#assistant-admin/);
  assert.match(legacy, /settings\/assistant/);
});

test("maintenance UI disables feedback and payment submissions", () => {
  const feedback = read("src/app/client/projects/[id]/feedback-panel.tsx");
  const billing = read("src/app/client/projects/[id]/billing-panel.tsx");
  assert.match(feedback, /disabled=\{pending \|\| readOnly\}/);
  assert.match(billing, /disabled=\{readOnly\}/);
  assert.match(billing, /open&&!readOnly/);
});
