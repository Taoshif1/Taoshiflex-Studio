"use client";
import { T } from "@/i18n/language-context";


import Link from "next/link";
import { useLanguage } from "@/i18n/language-context";
import { translateText } from "@/i18n/helpers";
import type { ServicePackage } from "@/types/content";
import { comparisonRows, deliveryStages, quoteFactors } from "@/content/pricing-translations";

const money = (value: number) => new Intl.NumberFormat("en-BD").format(value);
export function PricingContent({ packages }: { packages: ServicePackage[] }) {
  const { language, text: t } = useLanguage();
  const packageText = (_language: string, slug: string, value: string) => translateText(language, value, slug);
  return () => window.removeEventListener("storage", notify);
}

export function PricingContent({ packages }: { packages: ServicePackage[] }) {
  // SSR and initial hydration use English; saved preference is read after hydration.
  const savedLanguage = useSyncExternalStore(subscribeLanguage, storedLanguage, serverLanguage);
  const [selection, setSelection] = useState<PricingLanguage | null>(null);
  const language = selection ?? savedLanguage;
  const t = (text: string) => pricingText(language, text);
  function selectLanguage(next: PricingLanguage) {
    setSelection(next);
    try { localStorage.setItem(preferenceKey, next); }
    catch { /* The current page can still switch when storage is unavailable. */ }
  }

  return (
    <div className="pricing-page" lang={language}>
      <header className="container pricing-hero">
        <p className="eyebrow">{t("Services / Starting points")}</p>
        <h1 className="display">{t("Clear scope.")}<br />
          <span className="title-accent title-accent-gold">{t("Honest starting prices.")}</span>
        </h1>
        <p> <T id="pricing.chooseTheClosestStartingPointThesePackagesAssumeA"/> </p>
        <div className="pricing-hero-proof technical" aria-label={t("What Studio pricing covers")}>
          <span>{t("Requirements first")}</span>
          <span>{t("Custom design direction")}</span>
          <span>{t("Responsive engineering")}</span>
          <span>{t("QA + deployment")}</span>
        </div>
      </header>

      <section className={`container pricing-grid ${packages.length ? "" : "empty"}`} aria-label={t("Service packages")}>
        {packages.length ? packages.map((item, index) => (
          <article key={item.id} className={item.featured ? "featured" : ""}>
            {item.featured ? <span className="pricing-recommended">{t("Recommended")}</span> : null}
            <div className="pricing-index technical">{String(index + 1).padStart(2, "0")} / {packageText(language, item.slug, item.category)}</div>
            <h2>{packageText(language, item.slug, item.name)}</h2>
            <p className="package-value">{packageText(language, item.slug, item.description)}</p>
            <p className="price">
              {item.priceFrom === null ? t("Custom quote") : <>{t("Starting from")}<strong>৳{money(item.priceFrom)}</strong></>}
            </p>
            <ul>
              {item.features.map(feature => <li key={feature}><span className="pricing-feature-mark" aria-hidden="true">+</span><span>{packageText(language, item.slug, feature)}</span></li>)}
            </ul>
            <div className="package-meta">
              <span>{t("Delivery estimate")}</span>
              <strong>{packageText(language, item.slug, item.deliveryEstimate)}</strong>
              {item.revisions ? <small>{t("Revisions:")} {packageText(language, item.slug, item.revisions)}</small> : null}
              {item.support ? <small>{packageText(language, item.slug, item.support)}</small> : null}
            </div>
            <Link className="action" href={`/start-a-project?package=${item.slug}`}>{t("Discuss this scope")}<span aria-hidden>↗</span>
            </Link>
          </article>
        )) : (
          <div className="pricing-empty">
            <p className="eyebrow">{t("Catalog unavailable")}</p>
            <h2>{t("No public package is active.")}</h2>
            <p>{t("The Studio is reviewing its current service scopes. You can still send a project brief for a considered custom response.")}</p>
            <Link className="action" href="/start-a-project"><T id="pricing.startAProjectBrief"/></Link>
          </div>
        )}
      </section>

      <section className="container pricing-build" aria-labelledby="pricing-build-title">
        <div className="pricing-build-intro">
          <p className="eyebrow">{t("What the price is paying for")}</p>
          <h2 id="pricing-build-title">{t("Not a theme with your content dropped in.")}</h2>
          <p>{t("A cheaper template build can be the right choice when speed and a standard layout matter more than differentiation. Our listed starting points are for businesses that want the digital experience shaped around them.")}</p>
        </div>

        <ol className="pricing-build-timeline">
          {deliveryStages.map(stage => (
            <li key={stage.number}>
              <span className="pricing-stage-number technical">{stage.number}</span>
              <div>
                <h3>{t(stage.title)}</h3>
                <p>{t(stage.copy)}</p>
                <small>{t(stage.output)}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="pricing-compare" aria-labelledby="pricing-compare-title">
        <div className="container">
          <div className="pricing-section-heading">
            <div>
              <p className="eyebrow">{t("Why quotes can look wildly different")}</p>
              <h2 id="pricing-compare-title">{t("You may be comparing two different products.")}</h2>
            </div>
            <p>{t("Low-cost website packages are not automatically bad. They are usually optimized for speed and repeatability. A custom engagement spends more time on decisions that are specific to your business.")}</p>
          </div>

          <div className="pricing-comparison-table" role="table" aria-label={t("Template setup versus custom Studio engagement")}>
            <div className="pricing-comparison-head" role="row">
              <span role="columnheader">{t("What changes")}</span>
              <strong role="columnheader">{t("Template / standardized setup")}</strong>
              <strong role="columnheader">{t("Taoshiflex custom engagement")}</strong>
            </div>
            {comparisonRows.map(row => (
              <div className="pricing-comparison-row" role="row" key={t(row.label)}>
                <span role="cell">{t(row.label)}</span>
                <p role="cell">{t(row.lowCost)}</p>
                <p role="cell">{t(row.studio)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container pricing-quote-factors">
        <div>
          <p className="eyebrow">{t("What changes the final quote")}</p>
          <h2>{t("Complexity drives price. Company size does not.")}</h2>
          <p>{t("We do not inflate a quote because a business looks bigger. The final number changes when the work, risk, content or integrations change.")}</p>
        </div>
        <ul>
          {quoteFactors.map((factor, index) => (
            <li key={t(factor)}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {t(factor)}
            </li>
          ))}
        </ul>
      </section>

      <section className="container scope-note">
        <p className="eyebrow">{t("Scope note")}</p>
        <div>
          <h2>{t("Starting price does not mean unlimited scope.")}</h2>
          <p> <T id="pricing.domainHostingPaidAPIsPremiumPluginsOrServicesPayment"/> </p>
          <div className="scope-note-actions">
            <Link className="action action-solid" href="/start-a-project">{t("Start a project brief")}<span aria-hidden>↗</span></Link>
            <Link className="action" href="/work">{t("See how we build")}<span aria-hidden>↗</span></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
