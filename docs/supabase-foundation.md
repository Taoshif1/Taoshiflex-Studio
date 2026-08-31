# Supabase foundation

Phase 1B renders from published Supabase records when configured and retains typed local content in `src/content` as a resilient public fallback. The inquiry flow persists only through the validated, rate-limited server endpoint and reports configuration or storage failures honestly.

The initial migration models `projects`, `project_media`, `capabilities`, `inquiries`, `testimonials`, `site_settings`, and `admin_users`. Public RLS permits reads only for explicitly published content. Inquiry creation has no anonymous database policy; the validated, best-effort rate-limited server endpoint uses the protected service role. Admin CRUD requires a valid Auth identity whose UUID exists in `admin_users`.

Apply migrations `202608300001`, `202608300002`, and `202608300003` in timestamp order. Create an Auth user, then insert that user UUID into `admin_users`. The private `/studio-admin` route verifies both the Auth token and allowlist membership. The service-role and GitHub tokens remain server-only. GitHub curation creates private drafts; Featured and Published remain explicit admin decisions.

The second migration adds service packages, package features, assistant conversation storage, project curation fields, and admin RLS policies. Seed or manage package records in Supabase when database-driven pricing is desired; until then the public pricing page uses the checked-in BDT package catalog.

## Phase 1B.1 authorization

The `studio_access_token` cookie is HttpOnly, Secure in production, SameSite=Lax, and limited to one hour. Every request first validates that user access token against Supabase Auth. Only after Auth returns a valid user does server-only code use `SUPABASE_SECRET_KEY` to check that exact UUID in `admin_users`. No client or ordinary authenticated JWT can enumerate the allowlist. State-changing admin routes additionally require a matching `Origin`/`Host`, validate an explicit payload shape, and repeat the admin-session check. Logout is same-origin protected and deletes the cookie.

## Supabase API keys and headers

Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`), and backend-only `SUPABASE_SECRET_KEY` (`sb_secret_…`). A publishable key may be exposed to the browser and is sent to the Data/Auth APIs as `apikey` only. A modern secret key is sent from server code as `apikey` only. Neither modern API-key format is a JWT, so neither belongs in `Authorization: Bearer`.

Authenticated user calls send the publishable key in `apikey` and the user access token returned by Supabase Auth in `Authorization: Bearer`. The user token—not either API key—is the JWT carrying the user identity.

Never prefix the secret with `NEXT_PUBLIC_`, expose it to client components, or commit real keys. `SUPABASE_SERVICE_ROLE_KEY` remains supported as a transitional legacy fallback; only that legacy JWT path adds a privileged bearer header when `SUPABASE_SECRET_KEY` is absent.

Apply `202608300003_phase_1b_hardening.sql` after the first two migrations. It seeds the approved pricing catalog only when each package slug does not already exist; its feature rows are inserted only for packages created by that migration, so rerunning it cannot overwrite later admin edits.

## Rate limiting

The current limiter is a bounded, process-memory best-effort guard for local development and a single warm instance. It is not coordinated across regions or instances and resets when the process restarts. The `rateLimit` function is intentionally isolated so a distributed production implementation can replace it without changing inquiry or authentication route contracts.

## Phase 1C project media

Migration `202608310004_project_media_storage.sql` is additive and must be reviewed and applied manually after migrations 001 through 003. It adds an explicit `cover` / `gallery` role to `project_media`, enforces one Cover per project, indexes ordered galleries, restricts media rows to images, and creates the public `project-media` Storage bucket.

The bucket contains intentionally public marketing assets. It accepts JPEG, PNG, WebP, and AVIF images only, with a 6 MB object limit. Studio Admin repeats MIME, size, and file-signature validation on the server before uploading through privileged server-only credentials. Browser code never receives the Supabase secret and never performs privileged Storage mutations.

Storage paths are generated as `projects/<project-id>/<uuid>.<ext>`; raw filenames are not trusted. Public URLs are derived from `storage_path`, not persisted redundantly. Project deletion removes Storage objects before deleting the project row; the existing foreign-key cascade then removes `project_media` records. Media routes return a migration-required error when the bucket/role schema is unavailable, while public pages keep their designed placeholder fallback until media exists.
