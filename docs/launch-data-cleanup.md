# Launch data cleanup plan

This is a review checklist only. No deletion is authorized or performed by this document or the private-workspace refactor.

## Preserve

- Studio Admin Auth user and the matching `admin_users` allowlist entry.
- Public portfolio projects, `project_media` rows, and public media Storage objects.
- Service packages and package features.
- Policies and historical published policy versions.
- Public and private Studio settings, including Studio Presence, Assistant settings, inquiry alerts, and `client_workspace_maintenance`.
- All reviewed migrations, schema objects, RLS policies, functions, and triggers.

## Candidate demo data for explicit pre-launch review

- Test Client Auth users.
- Dummy `client_projects` and `client_project_members`.
- Dummy milestones, updates, deliverables, feedback, and notifications.
- Dummy private deliverable Storage files.
- Dummy project billing, payment schedules, payments, and reversals.
- Dummy inquiries.
- Assistant conversation rows, if conversation logging created any during testing.

Never identify candidates by a broad date range or naming guess alone. Create an explicit approved ID/email/project-reference manifest and take a recoverable backup before removal.

## Dependency and storage considerations

1. Export the approved deletion manifest and affected relational rows.
2. Confirm none of the selected inquiries or Client Projects are real launch records.
3. Record private deliverable `storage_path` values before deleting database rows.
4. Remove dependent Client records in a reviewed order: notifications and feedback; payments/reversals and schedules; billing; deliverables, updates, and milestones; memberships; then Client Projects.
5. Remove only the explicitly recorded private deliverable Storage objects after their database dependencies are handled.
6. Remove dummy inquiries and any explicitly identified Assistant conversation rows.
7. Delete test Auth users last, after memberships and authored records no longer depend on them.
8. Re-run foreign-key, orphaned-storage, Admin access, public portfolio, package, policy, and Client RLS checks.

Actual cleanup requires separate human approval, a production backup, and a maintenance window. Do not delete the Studio Admin user, its allowlist row, public media, authoritative settings, published policies, or migrations.
