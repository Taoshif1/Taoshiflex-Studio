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

Curated typed content remains a resilient public fallback while Supabase provides the production operating layer. Published and Featured flags control public project visibility, inquiries persist through a validated server route, and authenticated admins can curate GitHub repositories into private drafts.

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Run `npm run dev`

Apply all migrations in `supabase/migrations` in timestamp order, then configure the variables shown in `.env.example`. The public site still renders safe local fallbacks without credentials; persistence, authentication, and GitHub curation clearly report that configuration is unavailable.

Required production variables are `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SECRET_KEY`. `GITHUB_CURATOR_TOKEN` is optional. Never commit real keys. The legacy `SUPABASE_SERVICE_ROLE_KEY` remains accepted by server code only as a transitional fallback, but new environments should use `SUPABASE_SECRET_KEY`.

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

`/client` uses Supabase Auth email/password access and the project-scoped policies introduced in migration `202608310006_client_workspace_foundation.sql`. The authenticated Workspace includes projects, milestones, updates, feedback, billing, payments, notifications, policies, timeline events, and private or external deliverables.

Client access uses `signInWithPassword` with the existing `@supabase/ssr` cookie session. A successful browser sign-in writes the same Supabase SSR cookies used by server authorization and the Next.js 16 session-refresh proxy. Normal Client login has no OTP, Magic Link, callback, custom token POST, or application-managed access/refresh cookie.

Studio Admin's **Create Client Access** action first attempts to assign an existing Auth user by email. Existing users keep their current password. If no Auth user exists, the server requires a temporary password of at least eight characters, creates the confirmed Auth user with that password, and then assigns project membership. The secret/service credential and privileged Admin API remain server-only.

Client passwords are sent only to Supabase Auth for sign-in or initial server-side account creation. They are not stored in Client Project records, application database tables, browser storage, analytics, logs, or API responses. Project membership and RLS—not email, password, reference, or project ID alone—determine access.

Forgot Password uses a TokenHash recovery flow that does not depend on the browser which requested the email. The recovery email opens an intermediate confirmation page; a deliberate POST verifies the one-time token, establishes the Supabase SSR session, and creates a short-lived signed recovery-only intent before password replacement is allowed. An ordinary signed-in Client session alone cannot replace a password through this route.

In Supabase Authentication settings, set the production Site URL to `https://taoshiflexstudio.netlify.app` and configure custom SMTP. In **Authentication -> Email Templates -> Reset Password**, the recovery link must use this exact href (surrounding email copy may be branded):

```html
<a href="https://taoshiflexstudio.netlify.app/client/recovery?token_hash={{ .TokenHash }}&amp;type=recovery">Reset password</a>
```

Do not use `{{ .ConfirmationURL }}` for the production recovery link because that recreates the same-browser PKCE verifier dependency. Do not place SMTP credentials in this repository.

Clients can read only Client Projects where `client_project_members.user_id = auth.uid()`. The human-facing `TS-XXXXXXXX` reference is an identifier, never a password or authorization token. External deliverables use validated HTTPS links. Private deliverables use the non-public `client-deliverables` bucket: Studio uploads receive a short-lived path-scoped upload authorization, the server validates the completed object before compare-and-set attachment, and Clients receive short-lived signed downloads only after project membership is checked.

## Product direction

The public experience is organized around four conversion jobs:

1. Establish trust quickly.
2. Show a small number of strong, honestly labeled projects.
3. Explain how the studio works and who Gazi Taoshif is.
4. Make starting a qualified project simple.
