"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/i18n/language-context";
import { analyticsConfigured, analyticsLocation, clarityId, clearAnalyticsCookies, consentEvent, gaId, publicPath, readConsent, saveConsent, trackPublicEvent } from "@/lib/public-analytics";
import "./public-analytics.css";
const serverConsent = () => "pending" as const;
function subscribe(callback: () => void) {
  window.addEventListener(consentEvent, callback);
  window.addEventListener("storage", callback);
  window.addEventListener("pageshow", callback);
  const expiryCheck = window.setInterval(callback, 60000);
  return () => { window.removeEventListener(consentEvent, callback); window.removeEventListener("storage", callback); window.removeEventListener("pageshow", callback); window.clearInterval(expiryCheck); };
}
function loadScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id; script.src = src; script.async = true;
  document.head.appendChild(script);
}
function start() {
  if (window.studioAnalyticsStarted) return;
  window.studioAnalyticsStarted = true;
  if (gaId) {
    window.dataLayer ??= [];
    window.gtag = (...args: unknown[]) => { window.dataLayer!.push(args); };
    (window as unknown as Record<string, unknown>)["ga-disable-" + gaId] = false;
    window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.gtag("js", new Date());
    window.gtag("config", gaId, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      page_location: analyticsLocation(location.href), page_referrer: safeReferrer(), page_title: "Taoshiflex Studio" });
    loadScript("studio-ga", "https://www.googletagmanager.com/gtag/js?id=" + gaId);
  }
  // Do not record query-bearing documents: UTM attribution is handled by GA.
  if (clarityId && !location.search && !location.hash && location.pathname !== "/start-a-project") {
    const clarity = window.clarity = Object.assign((...args: unknown[]) => { clarity.q.push(args); }, {q: [] as unknown[][]});
    clarity("consentv2", { analytics_Storage: "granted", ad_Storage: "denied" });
    loadScript("studio-clarity", "https://www.clarity.ms/tag/" + clarityId);
  }
}
function safeReferrer() {
  try { const url = new URL(document.referrer); return url.origin === location.origin ? "" : url.origin + "/"; } catch { return ""; }
}
export function PublicAnalytics() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribe, readConsent, serverConsent);
  const [open, setOpen] = useState(false);
  const lastPage = useRef("");
  const { language } = useLanguage();
  useEffect(() => {
    if (!analyticsConfigured || !publicPath(pathname)) return;
    if (consent !== "accepted") {
      if (window.studioAnalyticsStarted) { clearAnalyticsCookies(); location.reload(); }
      return;
    }
    start();
    const page = analyticsLocation(location.href);
    if (gaId && page && lastPage.current !== page) {
      lastPage.current = page;
      window.gtag?.("set", { page_location: page, page_referrer: safeReferrer(), page_title: "Taoshiflex Studio" });
      window.gtag?.("event", "page_view", { page_location: page, page_path: pathname, page_title: "Taoshiflex Studio", page_referrer: safeReferrer() });
      const detail = pathname.match(/^\/(work|products)\/([a-z0-9-]+)$/);
      if (detail) trackPublicEvent(detail[1] === "work" ? "case_study_open" : "product_open", { [detail[1] === "work" ? "project_slug" : "product_slug"]: detail[2] });
    }
  }, [pathname, consent]);
  useEffect(() => {
    function click(event: MouseEvent) {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (!anchor) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin === location.origin && url.pathname === "/start-a-project") {
        trackPublicEvent("start_project_click");
        if (url.searchParams.has("package")) trackPublicEvent("pricing_package_select", {package_slug:url.searchParams.get("package")});
      }
      if (anchor.dataset.analyticsPlatform) trackPublicEvent("outbound_social_click", {platform:anchor.dataset.analyticsPlatform});
      if (anchor.dataset.analyticsProject || anchor.dataset.analyticsProduct) trackPublicEvent("outbound_live_project_click", {project_slug:anchor.dataset.analyticsProject, product_slug:anchor.dataset.analyticsProduct});
    }
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  function choose(choice: "accepted" | "rejected") {
    setOpen(false);
    saveConsent(choice);
    if (choice === "rejected") {
      if (gaId) (window as unknown as Record<string, unknown>)["ga-disable-" + gaId] = true;
      clearAnalyticsCookies();
      // A fresh document unloads third-party listeners, including Clarity.
      if (window.studioAnalyticsStarted) location.reload();
    }
  }
  if (!analyticsConfigured || !publicPath(pathname) || consent === "pending") return null;
  const bn = language === "bn";
  return <div className="analytics-preferences" data-clarity-mask="true">
    <button className="analytics-preferences-toggle" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open || consent === "unset"} aria-controls="analytics-choice">{bn ? "অ্যানালিটিক্স পছন্দ" : "Analytics preferences"}</button>
    {open || consent === "unset" ? <section id="analytics-choice" className="analytics-choice" aria-labelledby="analytics-heading">
      <h2 id="analytics-heading">{bn ? "আপনার গোপনীয়তা, আপনার পছন্দ" : "Your privacy, your choice"}</h2>
      <p>{bn ? "আপনার অনুমতি পেলে Google Analytics ও Microsoft Clarity দিয়ে প্রকাশ্য সাইটের ব্যবহার বুঝতে সাহায্য নেব। ব্যক্তিগত ওয়ার্কস্পেস ট্র্যাক করা হয় না। প্রত্যাখ্যান করেও সব সুবিধা ব্যবহার করতে পারবেন।" : "With your permission, Google Analytics and Microsoft Clarity help us understand use of the public site. Private workspaces are excluded. Declining does not affect site access."}</p>
      <Link href="/policies/privacy-policy">{bn ? "গোপনীয়তা নীতি" : "Privacy policy"}</Link>
      <div className="analytics-actions"><button type="button" onClick={() => choose("rejected")}>{bn ? "প্রত্যাখ্যান" : "Decline analytics"}</button><button type="button" onClick={() => choose("accepted")}>{bn ? "অনুমতি দিন" : "Allow analytics"}</button></div>
    </section> : null}
  </div>;
}
