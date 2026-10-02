import type { Metadata } from "next";
import Link from "next/link";
import { capabilities, processStages } from "@/content/site";
import "./services.css";

export const metadata: Metadata = {
  title: "Services",
  description: "Custom websites, e-commerce systems, business platforms and digital products from Taoshiflex Studio.",
  alternates: { canonical: "/services" },
  openGraph: {
    type: "website",
    title: "Services — Taoshiflex Studio",
    description: "Custom websites, e-commerce systems, business platforms and digital products from Taoshiflex Studio.",
    url: "/services",
  },
};

const serviceDetails = {
  websites: {
    bestFor: "Businesses that need a credible, differentiated web presence built around trust and conversion.",
    includes: [
      "Requirements and content structure",
      "Custom UI direction",
      "Responsive frontend engineering",
      "Lead and contact flows",
      "Basic technical SEO setup",
      "Deployment and handover",
    ],
  },
  commerce: {
    bestFor: "Brands that need the storefront and day-to-day store operations to work as one system.",
    includes: [
      "Catalog and product experience",
      "Search and filtering",
      "Cart and checkout flows",
      "Payment setup where applicable",
      "Order and store administration",
      "Launch QA and handover",
    ],
  },
  platforms: {
    bestFor: "Teams whose real workflow does not fit a generic plugin, spreadsheet or off-the-shelf tool.",
    includes: [
      "Workflow and role mapping",
      "Custom dashboards and interfaces",
      "Permissions and operational logic",
      "Data and API integration",
      "Administrative tools",
      "Production deployment",
    ],
  },
  products: {
    bestFor: "Founders and businesses turning an idea, service or internal capability into a real digital product.",
    includes: [
      "Discovery and MVP definition",
      "Experience architecture",
      "Product UI and interaction design",
      "Frontend and backend engineering",
      "Release planning and QA",
      "Iteration roadmap",
    ],
  },
} as const;

const engagementPrinciples = [
  {
    title: "Requirements before screens",
    copy: "We start by understanding what the business and the user actually need before deciding what the interface should look like.",
  },
  {
    title: "Design and engineering stay connected",
    copy: "The experience is designed with feasibility, maintainability and the final implementation in mind.",
  },
  {
    title: "No fake complexity",
    copy: "We do not add features to make a proposal look bigger. Scope is tied to the problem the product needs to solve.",
  },
  {
    title: "Launch is part of the work",
    copy: "Responsive QA, deployment and handover are treated as part of delivery—not an afterthought.",
  },
];

export default function ServicesPage() {
  return (
    <div className="services-page">
      <header className="container services-hero">
        <p className="eyebrow">Services / Creative engineering</p>
        <h1 className="display">
          Strategy to interface.<br />
          <span className="title-accent title-accent-blue">Interface to working system.</span>
        </h1>
        <div className="services-hero-foot">
          <p>
            Taoshiflex Studio combines product thinking, design and engineering so the thing
            that gets approved is also the thing that can be built, launched and operated.
          </p>
          <div className="services-hero-links">
            <Link className="action action-solid" href="/start-a-project">Start a project <span aria-hidden>↗</span></Link>
            <Link className="action" href="/pricing">See starting prices <span aria-hidden>↗</span></Link>
          </div>
        </div>
      </header>

      <section className="container services-index" aria-label="Studio services">
        {capabilities.map((service, index) => {
          const detail = serviceDetails[service.id as keyof typeof serviceDetails];
          return (
            <article id={service.id} key={service.id} className="service-block">
              <div className="service-block-number technical">{String(index + 1).padStart(2, "0")}</div>
              <div className="service-block-title">
                <p className="technical">{service.title}</p>
                <h2>{service.value}</h2>
                <p>{service.description}</p>
              </div>
              <div className="service-block-detail">
                <div>
                  <span className="technical">Best fit</span>
                  <p>{detail.bestFor}</p>
                </div>
                <div>
                  <span className="technical">Typical scope</span>
                  <ul>
                    {detail.includes.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div className="service-node-row" aria-label={service.title + " focus areas"}>
                  {service.nodes.map(node => <span key={node}>{node}</span>)}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="services-principles">
        <div className="container">
          <div className="services-section-heading">
            <div>
              <p className="eyebrow">How the Studio works</p>
              <h2>Custom does not mean chaotic.</h2>
            </div>
            <p>
              The process is structured enough to protect quality, but flexible enough to respond
              when discovery changes what the right solution should be.
            </p>
          </div>
          <div className="services-principle-grid">
            {engagementPrinciples.map((principle, index) => (
              <article key={principle.title}>
                <span className="technical">{String(index + 1).padStart(2, "0")}</span>
                <h3>{principle.title}</h3>
                <p>{principle.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container services-process" aria-labelledby="services-process-title">
        <div>
          <p className="eyebrow">Delivery system</p>
          <h2 id="services-process-title">Five deliberate moves.</h2>
          <p>
            The same core process adapts to a focused website, a commerce build or a more complex product.
          </p>
        </div>
        <ol>
          {processStages.map((stage, index) => (
            <li key={stage.id}>
              <span className="technical">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{stage.title}</h3>
                <p>{stage.what}</p>
                <small>{stage.deliverable}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="container services-cta">
        <div>
          <p className="eyebrow">Not sure which service fits?</p>
          <h2>Start with the problem, not the package.</h2>
          <p>
            Send the business goal, current situation and what you need the system to achieve.
            We can shape the right scope from there.
          </p>
        </div>
        <div>
          <Link className="action action-solid" href="/start-a-project">Build the brief <span aria-hidden>↗</span></Link>
          <Link className="action" href="/work">See selected work <span aria-hidden>↗</span></Link>
        </div>
      </section>
    </div>
  );
}
