# Supabase foundation

Phase 1 deliberately renders from typed local content in `src/content`. It requires no credentials and the inquiry flow never claims persistence.

The initial migration models `projects`, `project_media`, `capabilities`, `inquiries`, `testimonials`, `site_settings`, and `admin_users`. Public RLS permits reads only for explicitly published content. Inquiry creation intentionally has no anonymous database policy; a future server-side endpoint must validate and rate-limit a typed payload before using a protected service role. Admin CRUD should require an authenticated user whose UUID exists in `admin_users`.

Project media paths are designed for a future private management flow and public Supabase Storage delivery. Authentication and the manager UI are outside Phase 1.
