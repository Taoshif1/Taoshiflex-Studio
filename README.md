# Taoshiflex Studio

The commercial website and project platform for Taoshiflex Studio — a founder-led web design and development studio serving ambitious businesses in Bangladesh first, with an international-ready foundation.

## Architecture

- Next.js 16 App Router + React 19 + TypeScript
- Tailwind CSS 4 plus a custom brand design system
- Motion for restrained, accessible animation
- Supabase Postgres for projects, services, inquiries, and settings
- Supabase Auth for the private studio manager
- Supabase Storage for project media
- Row Level Security for public/private content separation

Phase 1B keeps curated typed content as a resilient public fallback and adds an optional Supabase-backed operating layer. Published and Featured flags control public project visibility, inquiries persist through a validated server route, and authenticated admins can curate GitHub repositories into private drafts.

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Run `npm run dev`

Apply all migrations in `supabase/migrations` in timestamp order, then configure the variables shown in `.env.example`. The public site still renders safely without credentials; persistence, authentication, and GitHub curation clearly report that configuration is unavailable.

## Useful scripts

- `npm run dev` — local development
- `npm run lint` — ESLint
- `npm run build` — production build
- `npm run start` — run the production build

## Content model

Projects support a client/business name, service name, category, status, public/private visibility, case-study copy, repository URL, live URL, images, tags, and ordering. Inquiries are stored separately and are visible only to authenticated studio admins.

## Studio Admin

`/studio-admin` is noindexed and protected by Supabase Auth plus membership in `admin_users`. `SUPABASE_SECRET_KEY` and `GITHUB_CURATOR_TOKEN` are server-only. GitHub imports always enter as unpublished, unfeatured drafts with repository visibility disabled; an admin must replace generated placeholders with verified content before publishing.

Admin authorization validates the cookie token with Supabase Auth and performs the private `admin_users` membership lookup with backend-only elevated access. Mutations require a same-origin request and re-check authorization. The in-memory rate limiter is best-effort only and is not a distributed production limit; see `docs/supabase-foundation.md`.

Supabase configuration prefers `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`) for public/Auth requests and backend-only `SUPABASE_SECRET_KEY` (`sb_secret_…`) for privileged Data API requests. The publishable key may be exposed to browser code; the secret key must never use a `NEXT_PUBLIC_` prefix or be committed. `SUPABASE_SERVICE_ROLE_KEY` is accepted only as a transitional legacy JWT fallback.

The Studio Assistant is a deliberately constrained foundation: its browser-side answers use approved pricing/process copy only and hand project-specific discussions to the persisted inquiry flow. It does not expose a model credential or claim autonomous knowledge.

## Client Workspace

`/client` uses Supabase Auth passwordless email access and migration `202608310006_client_workspace_foundation.sql`. Apply migration 006 manually after review; the application intentionally degrades to a setup notice before it exists. Add both the production `/client/auth/callback` URL and the local development callback (for example `http://localhost:3000/client/auth/callback`) to Supabase Auth Redirect URLs. Supabase email delivery and the email template must be configured to provide either a magic link or the `{{ .Token }}` one-time code.

Clients can read only Client Projects where `client_project_members.user_id = auth.uid()`. The human-facing `TS-XXXXXXXX` reference is an identifier, never a password or authorization token. New client members must already exist in Supabase Auth before an Admin assigns their email. Deliverable file uploads are deliberately deferred; Phase 1D supports membership-protected records and optional external HTTPS links, while `storage_path` reserves the boundary for a future private bucket and signed-URL implementation.

## Product direction

The public experience is organized around four conversion jobs:

1. Establish trust quickly.
2. Show a small number of strong, honestly labeled projects.
3. Explain how the studio works and who Gazi Taoshif is.
4. Make starting a qualified project simple.
