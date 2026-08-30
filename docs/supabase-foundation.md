# Supabase foundation

Phase 1B renders from published Supabase records when configured and retains typed local content in `src/content` as a resilient public fallback. The inquiry flow persists only through the validated, rate-limited server endpoint and reports configuration or storage failures honestly.

The initial migration models `projects`, `project_media`, `capabilities`, `inquiries`, `testimonials`, `site_settings`, and `admin_users`. Public RLS permits reads only for explicitly published content. Inquiry creation intentionally has no anonymous database policy; a future server-side endpoint must validate and rate-limit a typed payload before using a protected service role. Admin CRUD should require an authenticated user whose UUID exists in `admin_users`.

Apply `202608300001_public_foundation.sql` followed by `202608300002_phase_1b_studio_admin.sql`. Create an Auth user, then insert that user UUID into `admin_users`. The private `/studio-admin` route verifies both the Auth token and allowlist membership. The service-role and GitHub tokens remain server-only. GitHub curation creates private drafts; Featured and Published remain explicit admin decisions.

The second migration adds service packages, package features, assistant conversation storage, project curation fields, and admin RLS policies. Seed or manage package records in Supabase when database-driven pricing is desired; until then the public pricing page uses the checked-in BDT package catalog.
