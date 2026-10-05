# Analytics and SEO operations

SEO makes public pages crawlable and understandable. Google Search Console measures Google Search visibility and indexing. GA4 measures consented visits and interactions after arrival. None guarantees indexing or a ranking.

## Before enabling production tracking

Leave tracker IDs empty until the Privacy Policy is updated and provider settings below are verified. Configure these in the hosting project's production environment and rebuild: NEXT_PUBLIC values are compiled into browser bundles.

| Variable | Purpose |
| --- | --- |
| NEXT_PUBLIC_GA_MEASUREMENT_ID | GA4 Web Data Stream measurement ID |
| NEXT_PUBLIC_CLARITY_PROJECT_ID | Optional Clarity project ID |
| NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION | Optional Google HTML verification token |
| NEXT_PUBLIC_BING_SITE_VERIFICATION | Optional Bing HTML verification token |

No IDs, credentials or verification tokens are supplied. Production tracking can remain disabled indefinitely. DNS inspection on 2026-10-05 found an existing Google verification TXT record for taoshiflexstudio.me. Preserve it. This does not establish which account owns the property; a meta tag is unnecessary when existing DNS verification works. No production policy, DNS or provider setting was changed.

## GA4 setup

1. Create/select a Google Analytics account and GA4 property. Choose the intended reporting timezone and currency.
2. Admin → Data streams → Add stream → Web. Enter https://taoshiflexstudio.me and a Studio stream name.
3. **Disable all Enhanced Measurement before enabling the ID.** The app explicitly sends page views and selected events. Automatic history page views would double count; automatic forms/search/outbound events can collect unexpected values. Keep user-provided data collection, Google Signals and advertising integrations disabled.
4. Put the stream's G- measurement ID in NEXT_PUBLIC_GA_MEASUREMENT_ID. Leave local and preview IDs blank; do not send QA traffic to the production property.
5. After an approved release, use a fresh browser session, allow analytics, navigate public routes and inspect GA4 Realtime. Confirm one page_view per route visit and the custom events below. Standard reports can take longer to populate.
6. In another fresh session decline: there should be no Google/Clarity script or collection request. Inspect collection payloads for accidental personal data. Navigate public → Client/Admin and Back; private pages must have no tracker script or collection activity.

Official references: [GA4 setup](https://support.google.com/analytics/answer/9304153), [manual page views](https://developers.google.com/analytics/devguides/collection/ga4/views), [Enhanced Measurement](https://support.google.com/analytics/answer/9216061).

## Custom events

All events contain a public page_path. Only the listed extra fields are accepted.

| Event | Trigger | Extra fields |
| --- | --- | --- |
| start_project_click | Public brief link | none |
| pricing_package_select | Package-specific brief link | package_slug |
| inquiry_start | First brief selection | none |
| inquiry_submit_success | Server confirms brief received | none |
| case_study_open | Public case study viewed | project_slug |
| product_open | Product detail viewed | product_slug |
| outbound_social_click | Studio social link | platform |
| outbound_live_project_click | Published live project/product link | project_slug or product_slug |
| language_change | Visitor changes EN/Bangla | language |

No names, emails, brief answers, inquiry references, payment data, private project IDs/titles or review drafts are sent. Do not put personal data into public slugs or campaigns. Do not add arbitrary event parameters.

Mark inquiry_submit_success as a **key event** in GA4 Admin → Events. It means a brief was received, not a paid project or revenue. Register event-scoped custom dimensions for package_slug, project_slug, product_slug, platform and language if needed in explorations. Web Vitals tracking is deliberately omitted to avoid additional measurement code.

## UTM convention

Use lowercase stable identifiers with underscores, no spaces or personal data. Source identifies the platform, medium the channel, campaign the initiative:

- Facebook: https://taoshiflexstudio.me/?utm_source=facebook&utm_medium=social&utm_campaign=studio_launch
- LinkedIn: https://taoshiflexstudio.me/?utm_source=linkedin&utm_medium=social&utm_campaign=studio_launch
- Fiverr: https://taoshiflexstudio.me/?utm_source=fiverr&utm_medium=profile&utm_campaign=studio
- GitHub: https://taoshiflexstudio.me/?utm_source=github&utm_medium=profile&utm_campaign=studio

The address bar retains query parameters. GA page locations keep these three conventional UTM fields; arbitrary queries, fragments, utm_term and utm_content are excluded. Attribution is not stored in the Studio database. External referrers are reduced to origin, excluding path/query; same-origin referrers are blank.

In Traffic acquisition compare **Session source / medium** and **Session campaign**. User acquisition uses first-user attribution and may differ. Compare landing pages and key events by campaign. Validate a controlled campaign link before promoting it.

## Google Search Console

Use the existing verified property; do not replace its TXT record. Ask its owner for access if needed. Submit https://taoshiflexstudio.me/sitemap.xml under Sitemaps. It contains /, /work, /products, /services, /pricing, /start-a-project, /policies and published Work/Product/Policy details. Real update dates are used when available; static pages omit invented dates.

For a new published page, use URL Inspection, test the live URL, check its canonical/indexing eligibility, then request indexing. Requests do not guarantee indexing or speed. Use the sitemap for bulk discovery. Monitor Page indexing, Core Web Vitals and Search results.

To link Search Console to GA4: Admin → Product links → Search Console links → Link. Select the verified property and matching Web Data Stream. Appropriate Search Console ownership and GA4 editing permissions are required. Publish the Search Console report collection in the GA4 report library if needed.

References: [linking](https://support.google.com/analytics/answer/10737381), [URL Inspection](https://support.google.com/webmasters/answer/9012289), [request crawling](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).

## Bing Webmaster Tools

Sign in and import the verified Google Search Console property when offered. Review access, select Studio and confirm its imported sitemap. Alternatively add the site manually and verify by DNS or NEXT_PUBLIC_BING_SITE_VERIFICATION using the actual Bing HTML token.

Submit/confirm https://taoshiflexstudio.me/sitemap.xml under Sitemaps. Review processing, crawl issues, URL Inspection and Search Performance. IndexNow is unnecessary for this small revalidated public catalog.

References: [import/verify](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b), [sitemaps](https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed).

## Optional Microsoft Clarity

Create a Studio project and set NEXT_PUBLIC_CLARITY_PROJECT_ID. Configure **Strict masking** and require cookie consent before enabling it. Do not install another tag through a second integration.

Only consented public marketing documents load Clarity. Analytics consent is granted and advertising consent denied. The whole body has data-clarity-mask; no identify API is used. Clarity does not load on the inquiry route or initial URLs with query strings/fragments. The inquiry has a separate root layout so a recorder cannot carry into its form. Client/Admin/API never load it. Coverage is intentionally narrower than GA4.

Use a separate test project and non-sensitive test data to validate masking. Inspect recordings and network traffic, including public/private transitions. CSP permits only provider script/collection hosts; do not loosen it for optional advertising endpoints.

References: [masking](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking), [ConsentV2](https://learn.microsoft.com/en-gb/clarity/setup-and-installation/clarity-consent-api-v2), [CSP](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-csp).

## Consent and required Privacy Policy action

The bilingual preference UI appears only with a valid tracker ID. Default is no tracking, including no pre-consent cookieless pings. Accept/decline have equal prominence. Site functionality never depends on consent. A versioned local-storage choice lasts 180 days. Visitors can reopen Analytics preferences and withdraw. Withdrawal clears Studio analytics cookies and reloads to unload third-party code; do this before filling an unsent brief.

This implementation applies prior opt-in globally, including international visitors, without geolocation. Have the policy owner review applicable obligations before enabling trackers; technical controls alone are not a compliance certification. [ICO cookie guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/).

The public Privacy Policy audited on 2026-10-05 was **Version 2, effective September 4, 2026**. It describes operational information and service providers, but does not specifically disclose GA4, Clarity, analytics cookies or preferences. **Publish a reviewed revision in Studio Admin before configuring production IDs.** This task does not mutate the production policy.

The revision should explain:

- GA4 traffic/source/campaign measurement and optional Clarity masked heatmaps/session recording.
- Cookies/browser identifiers, device/browser data and consented public interaction data, plus the 180-day local-storage preference.
- No Client Workspace/Admin/API analytics and no intentional collection of names, emails, briefs, payments or private project information.
- Prior opt-in, optional access, decline/withdrawal through Analytics preferences.
- Providers, international processing/transfers, actual configured retention periods and cookie lifetimes; inspect accounts rather than inventing durations.
- Provider privacy information and Studio contact/rights procedures.

## Route and SEO boundaries

/client, /client/**, /studio-admin, /studio-admin/** and /api/** are excluded from tracking and the sitemap, and disallowed in robots.txt. Private responses use noindex and restrictive CSP. Robots is not access control: auth, membership checks and RLS remain required and unchanged. Private review pages are excluded.

Public URLs are unchanged by the (public) filesystem group. Public metadata includes canonical URLs and social previews. Structured data is limited to truthful Organization/ProfessionalService, WebSite and public breadcrumbs: no fabricated aggregate ratings, awards, counts, addresses or prices. Reviews still come from the existing published public view.

Separate root layouts are deliberate: do not reintroduce an analytics-bearing shared app/layout.tsx. The global 404 uses Next's globalNotFound convention without analytics.

## Interpreting results

| Metric | Meaning |
| --- | --- |
| Users | Measured visitors under the report's identity definition, not an exact people count |
| Sessions | Groups of interactions; one person can have several |
| Page views | Page views including repeat visits |
| Landing page | First page of a session |
| Source / medium | Origin and channel classification |
| Campaign | Consistent utm_campaign initiative |
| Key events / conversions | Selected meaningful actions; inquiries are not revenue |
| Search impressions | Result appearances as defined by the search engine |
| Search clicks | Clicks from search results |
| CTR | Search clicks divided by impressions |
| Average position | Averaged search position across queries/devices/locations, not a fixed ranking |

Consent, blockers, attribution, timezone and processing differences mean Search Console/Bing and GA4 totals will differ. Compare trends and qualified enquiries rather than treating any dashboard as a complete visitor ledger.
