// Public analytics has no dependency on authentication, inquiry data or private models.
export const consentKey = "studio.analytics-consent.v1";
export const consentEvent = "studio:analytics-consent";
export const gaId = /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "") ? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID! : "";
export const clarityId = /^[a-z0-9]{4,32}$/.test(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "") ? process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID! : "";
export const analyticsConfigured = Boolean(gaId || clarityId);
export type Consent = "pending" | "unset" | "accepted" | "rejected";
let memoryConsent: Consent = "unset";
export function readConsent(): Consent {
  try {
    const raw = localStorage.getItem(consentKey);
    if (!raw) return "unset";
    const value = JSON.parse(raw);
    return value.expires > Date.now() && ["accepted", "rejected"].includes(value.choice) ? value.choice : "unset";
  } catch { return memoryConsent; }
}
export function saveConsent(choice: "accepted" | "rejected") {
  memoryConsent = choice;
  try { localStorage.setItem(consentKey, JSON.stringify({choice, expires: Date.now() + 180 * 86400000})); } catch { /* This document still respects the choice. */ }
  window.dispatchEvent(new Event(consentEvent));
}
export function publicPath(path: string): string | null {
  return /^(?:\/(?:work|products|policies)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?|\/(?:services|pricing|start-a-project)?)(?:\/)?$/.test(path) ? path.replace(/\/$/, "") || "/" : null;
}
const identifier = (value: unknown) => typeof value === "string" && /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(value) && value.length <= 80 ? value : undefined;
// Keep campaign attribution, never forward arbitrary query strings, fragments or referrer paths.
export function analyticsLocation(href: string) {
  const url = new URL(href);
  const path = publicPath(url.pathname);
  if (!path) return null;
  const params = new URLSearchParams();
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const value = identifier(url.searchParams.get(key));
    if (value) params.set(key, value);
  }
  return url.origin + path + (params.size ? "?" + params : "");
}
export type StudioEvent = "start_project_click" | "pricing_package_select" | "inquiry_start" | "inquiry_submit_success" | "case_study_open" | "product_open" | "outbound_social_click" | "outbound_live_project_click" | "language_change";
export function eventPayload(name: StudioEvent, path: string, input: Record<string, unknown> = {}) {
  const page = publicPath(path);
  if (!page) return null;
  const keys: Record<StudioEvent, string[]> = {
    start_project_click: [], pricing_package_select: ["package_slug"], inquiry_start: [],
    inquiry_submit_success: [], case_study_open: ["project_slug"], product_open: ["product_slug"],
    outbound_social_click: ["platform"], outbound_live_project_click: ["project_slug", "product_slug"], language_change: ["language"],
  };
  if (!Object.hasOwn(keys, name)) return null;
  const payload: Record<string, string> = { page_path: page };
  for (const key of keys[name]) {
    const value = identifier(input[key]);
    if (value && (key !== "language" || ["en", "bn"].includes(value)) &&
        (key !== "platform" || ["facebook","linkedin","github","fiverr","instagram","youtube","x","behance","dribbble"].includes(value))) payload[key] = value;
  }
  return payload;
}
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[][] };
    studioAnalyticsStarted?: boolean;
  }
}
export function trackPublicEvent(name: StudioEvent, input: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !gaId || readConsent() !== "accepted") return;
  const payload = eventPayload(name, window.location.pathname, input);
  if (payload) window.gtag?.("event", name, payload);
}
export function clearAnalyticsCookies() {
  // Only analytics cookies; never touch auth, recovery or workspace cookies.
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.trim().split("=")[0];
    if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_clck$|_clsk$)/.test(name)) continue;
    const parts = location.hostname.split(".");
    for (let i = 0; i < parts.length - 1; i++) document.cookie = name + "=; Max-Age=0; Path=/; Domain=." + parts.slice(i).join(".") + "; SameSite=Lax";
    document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax";
  }
}
