# Production security audit continuation

Branch: security/full-production-audit. Audit resumed from the existing local worktree; no commit, deployment, production migration, or production write is authorized by this report.

## Deployment configuration

- Apply 20261001155813_production_security_hardening.sql only after human review, before deploying the dependent application. Public inquiry, assistant and Studio login budgets fail closed when the RPC is missing.
- NEXT_PUBLIC_SITE_URL must be the exact canonical HTTPS origin (https://taoshiflexstudio.me). A preview build must use its own exact HTTPS origin and isolated Supabase configuration. No wildcard preview origins or forwarded-host trust is used.
- Non-production loopback requests accept their matching localhost/127.0.0.1/[::1] origin. A local production build intentionally retains production origin restrictions; use an HTTPS test origin for authenticated mutation testing.
- Keep Supabase secret/service-role, Gemini, GitHub and SMTP credentials server-only. Configure Supabase recovery redirect URLs and templates for the deployment origin; maintain private client-deliverables Storage and public marketing-image Storage separately.
- Netlify must overwrite x-nf-client-connection-ip at its trusted edge. Invalid/missing headers collapse to one shared budget; IPv6 representations are normalized. Off Netlify all unauthenticated callers share a conservative fallback budget. Verify proxy behavior at the actual deployment.

## Rate-limit boundaries

The 5,000-entry memory limiter is instance-local, including admin (120/min/account) and signed-download (30/min/account) limits. It does not provide distributed Netlify enforcement. Public Studio login (8/15 min), inquiries (5/hour), and Assistant (8/min and 40/hour) additionally consume atomic Postgres budgets in production. Feedback (20/min/account) and payment submissions (20/hour/account) have database triggers covering direct REST writes. Edge DDoS controls, Supabase Auth quotas/CAPTCHA, provider spend limits, and legitimate shared-IP traffic still require infrastructure configuration.

## Migration review

The migration adds tables, constraints, triggers and functions, replaces narrowly scoped policies/projections, and intentionally tightens grants. It does not drop production tables or delete existing business records. NOT VALID constraints preserve existing rows while constraining future writes. Existing invalid rows can still require manual remediation before a later update. Public Work exposes explicitly authored content and relational marketing media, never arbitrary content/media metadata. Products and Reviews retain their existing public projections. Definer functions resolve through trusted schemas; public-schema CREATE is revoked from untrusted roles and pg_temp is placed last for existing definer functions. Newly added definer functions use an empty search_path and qualified application relations.

PGlite executes the full migration chain with anon/authenticated/service_role identities. Supabase auth/storage schemas are modeled locally; pgcrypto is replaced with a local fixture helper. This validates SQL/RLS behavior, not the hosted Auth, Storage, PostgREST, or Netlify runtime configuration.

## Input and upload boundaries

JSON parsing limits the actual stream, time, bytes, nesting and array size, with route/method field allowlists. Domain parsers retain required and optional fields; plain strings remain React-rendered text. URL sinks accept bounded credential-free HTTPS URLs. Internal links remain origin-relative. JSON-LD escapes less-than characters before its sole HTML insertion sink.

Public image uploads have a 6 MiB body/file ceiling and Sharp decoding with a 16-million-pixel limit and one page, then re-encoding. Their original filenames are ignored in favor of UUID paths, so Unicode, double-extension and traversal-shaped original names cannot select a storage path. Private files have a 25 MiB ceiling, extension/MIME agreement, signatures, scoped signed upload tickets, finalized size/type verification and image decoding. Private document signatures are not full PDF/Office/archive parsers or malware scanning. Downloads are authorized with the user's JWT before short-lived attachment URLs are signed. Cleanup of abandoned uploads and document malware scanning remain operational concerns.

## CSP and verification limits

Production CSP does not allow unsafe-eval. unsafe-inline remains for Next hydration scripts and React/Motion styles in the current rendering architecture; script attributes, objects and frames are blocked. A nonce-based CSP is a separate rendering/cache design change. HSTS is sent in production mode and honored over HTTPS. Local HTTP checks cannot establish Netlify TLS or edge-header behavior.

Browser checks use the built application, no real credentials, and no form submission to production. Current public production data contains no Products or Reviews. The temporary browser fixture preload was removed during final cleanup; populated rendering and hostile plain text were exercised in the earlier audit.

Node's MODULE_TYPELESS_PACKAGE_JSON test warning is existing module auto-detection, not a test failure. npm may report optional WASM helper packages as extraneous even after a clean lockfile installation. Preserve package-lock.json and use npm ci for reproducibility.

## Maintained verification commands

npm audit; npm ls --depth=0; npm run lint; npx tsc --noEmit; npm run test:analytics; npm run test:assistant; npm run test:studio; npm run test:workspace; npm run test:security; npm run build.

Additional checks: node tests/security-secrets.mjs (pattern-based history/worktree scan; never prints credential values), node tests/studio-public-api.mjs (GET-only hosted public-key probe), and agent-browser against next start on loopback. Run every required command after the last source/config/test edit. The final conversational report records actual results.
