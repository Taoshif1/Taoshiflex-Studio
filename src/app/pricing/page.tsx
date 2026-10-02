import type { Metadata } from "next";
import Link from "next/link";
import { getActivePackages } from "@/lib/studio-data";
import "./pricing.css";
import "./phase1c1.css";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Starting prices for custom-designed websites, commerce systems and web applications from Taoshiflex Studio.",
  alternates: { canonical: "/pricing" },
};

const money = (value: number) => new Intl.NumberFormat("en-BD").format(value);

const deliveryStages = [
  {
    number: "01",
    title: "Requirements",
    copy: "We clarify the business goal, audience, content, features, integrations and what success actually needs to look like.",
    output: "Project brief + scope",
  },
  {
    number: "02",
    title: "Structure + UX",
    copy: "We shape the sitemap, user journeys, content hierarchy and the experience before visual polish starts.",
    output: "Experience structure",
  },
  {
    number: "03",
    title: "Custom UI design",
    copy: "The interface is designed around your brand and use case instead of dropping your content into a pre-bought theme.",
    output: "Custom design direction",
  },
  {
    number: "04",
    title: "Engineering",
    copy: "We build the approved experience as responsive, maintainable software with the integrations your scope actually needs.",
    output: "Working production build",
  },
  {
    number: "05",
    title: "QA + launch",
    copy: "We test responsive behaviour, key flows, content, performance and deployment before the public release.",
    output: "Verified deployment",
  },
  {
    number: "06",
    title: "Support + growth",
    copy: "Handover, post-launch support or an ongoing improvement plan can be included according to the agreed package and scope.",
    output: "Support / next-step plan",
  },
];

const comparisonRows = [
  {
    label: "Starting point",
    lowCost: "Existing theme, template or page-builder system",
    studio: "Your requirements, users and business goal",
  },
  {
    label: "Design",
    lowCost: "Adapt an existing visual structure",
    studio: "Custom structure and interface direction",
  },
  {
    label: "Engineering",
    lowCost: "Configure an existing stack around standard needs",
    studio: "Build and integrate the behaviour your scope requires",
  },
  {
    label: "Flexibility",
    lowCost: "Best when your needs fit the template",
    studio: "Better when your workflow, brand or product needs are specific",
  },
  {
    label: "After launch",
    lowCost: "Varies by provider and package",
    studio: "Clear handover plus scoped support or growth options",
  },
];

const quoteFactors = [
  "Number of pages, screens and content states",
  "Custom interactions, animation and design depth",
  "Product catalog, checkout and commerce complexity",
  "User accounts, roles, dashboards and internal workflows",
  "Payment, courier, CRM, analytics or other integrations",
  "Content migration, copywriting, data entry and launch urgency",
];

export default async function PricingPage() {
  const packages = await getActivePackages();

  return (
    <div className="pricing-page">
      <header className="container pricing-hero">
        <p className="eyebrow">Services / Starting points</p>
        <h1 className="display">
          Clear scope.<br />
          <span className="title-accent title-accent-gold">Honest starting prices.</span>
        </h1>
        <p>
          Choose the closest starting point. These packages assume a custom-designed,
          custom-engineered engagement—not a pre-bought theme with your logo and copy swapped in.
          Every final proposal reflects the real content, integrations and operational requirements
          of your project.
        </p>
        <div className="pricing-hero-proof technical" aria-label="What Studio pricing covers">
          <span>Requirements first</span>
          <span>Custom design direction</span>
          <span>Responsive engineering</span>
          <span>QA + deployment</span>
        </div>
      </header>

      <section className={`container pricing-grid ${packages.length ? "" : "empty"}`} aria-label="Service packages">
        {packages.length ? packages.map((item, index) => (
          <article key={item.id} className={item.featured ? "featured" : ""}>
            {item.featured ? <span className="pricing-recommended">Recommended</span> : null}
            <div className="pricing-index technical">{String(index + 1).padStart(2, "0")} / {item.category}</div>
            <h2>{item.name}</h2>
            <p className="package-value">{item.description}</p>
            <p className="price">
              {item.priceFrom === null ? "Custom quote" : <>Starting from <strong>৳{money(item.priceFrom)}</strong></>}
            </p>
            <ul>
              {item.features.map(feature => <li key={feature}>{feature}</li>)}
            </ul>
            <div className="package-meta">
              <span>Delivery estimate</span>
              <strong>{item.deliveryEstimate}</strong>
              {item.revisions ? <small>Revisions: {item.revisions}</small> : null}
              {item.support ? <small>{item.support}</small> : null}
            </div>
            <Link className="action" href={`/start-a-project?package=${item.slug}`}>
              Discuss this scope <span aria-hidden>↗</span>
            </Link>
          </article>
        )) : (
          <div className="pricing-empty">
            <p className="eyebrow">Catalog unavailable</p>
            <h2>No public package is active.</h2>
            <p>The Studio is reviewing its current service scopes. You can still send a project brief for a considered custom response.</p>
            <Link className="action" href="/start-a-project">Start a project brief →</Link>
          </div>
        )}
      </section>

      <section className="container pricing-build" aria-labelledby="pricing-build-title">
        <div className="pricing-build-intro">
          <p className="eyebrow">What the price is paying for</p>
          <h2 id="pricing-build-title">Not a theme with your content dropped in.</h2>
          <p>
            A cheaper template build can be the right choice when speed and a standard layout matter
            more than differentiation. Our listed starting points are for businesses that want the
            digital experience shaped around them.
          </p>
        </div>

        <ol className="pricing-build-timeline">
          {deliveryStages.map(stage => (
            <li key={stage.number}>
              <span className="pricing-stage-number technical">{stage.number}</span>
              <div>
                <h3>{stage.title}</h3>
                <p>{stage.copy}</p>
                <small>{stage.output}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="pricing-compare" aria-labelledby="pricing-compare-title">
        <div className="container">
          <div className="pricing-section-heading">
            <div>
              <p className="eyebrow">Why quotes can look wildly different</p>
              <h2 id="pricing-compare-title">You may be comparing two different products.</h2>
            </div>
            <p>
              Low-cost website packages are not automatically bad. They are usually optimized for
              speed and repeatability. A custom engagement spends more time on decisions that are
              specific to your business.
            </p>
          </div>

          <div className="pricing-comparison-table" role="table" aria-label="Template setup versus custom Studio engagement">
            <div className="pricing-comparison-head" role="row">
              <span role="columnheader">What changes</span>
              <strong role="columnheader">Template / standardized setup</strong>
              <strong role="columnheader">Taoshiflex custom engagement</strong>
            </div>
            {comparisonRows.map(row => (
              <div className="pricing-comparison-row" role="row" key={row.label}>
                <span role="cell">{row.label}</span>
                <p role="cell">{row.lowCost}</p>
                <p role="cell">{row.studio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container pricing-quote-factors">
        <div>
          <p className="eyebrow">What changes the final quote</p>
          <h2>Complexity drives price. Company size does not.</h2>
          <p>
            We do not inflate a quote because a business looks bigger. The final number changes when
            the work, risk, content or integrations change.
          </p>
        </div>
        <ul>
          {quoteFactors.map((factor, index) => (
            <li key={factor}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {factor}
            </li>
          ))}
        </ul>
      </section>

      <section className="container scope-note">
        <p className="eyebrow">Scope note</p>
        <div>
          <h2>Starting price does not mean unlimited scope.</h2>
          <p>
            Domain, hosting, paid APIs, premium plugins or services, payment-gateway and merchant
            fees, and other third-party costs are separate unless a proposal explicitly includes
            them. Payment setup depends on the client supplying properly verified merchant accounts.
            “Tracking” means order-status tracking unless a third-party courier API integration is
            specifically included.
          </p>
          <div className="scope-note-actions">
            <Link className="action action-solid" href="/start-a-project">Start a project brief <span aria-hidden>↗</span></Link>
            <Link className="action" href="/work">See how we build <span aria-hidden>↗</span></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
