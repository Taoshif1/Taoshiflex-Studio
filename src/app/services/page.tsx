import { DynamicText, T } from "@/i18n/language-context";
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
        <p className="eyebrow"><T id="services.servicesCreativeEngineering"/></p>
        <h1 className="display"> <T id="services.strategyToInterface"/><br />
          <span className="title-accent title-accent-blue"><T id="services.interfaceToWorkingSystem"/></span>
        </h1>
        <div className="services-hero-foot">
          <p> <T id="services.taoshiflexStudioCombinesProductThinkingDesignAndEngineeringSo"/> </p>
          <div className="services-hero-links">
            <Link className="action action-solid" href="/start-a-project"><T id="services.startAProject"/> <span aria-hidden>↗</span></Link>
            <Link className="action" href="/pricing"><T id="services.seeStartingPrices"/> <span aria-hidden>↗</span></Link>
          </div>
        </div>
      </header>

      <section className="container services-index" aria-labelledby="services-index-title"><h2 className="sr-only" id="services-index-title"><T id="services.servicesCreativeEngineering"/></h2>
        {capabilities.map((service, index) => {
          const detail = serviceDetails[service.id as keyof typeof serviceDetails];
          return (
            <article id={service.id} key={service.id} className="service-block">
              <div className="service-block-number technical">{String(index + 1).padStart(2, "0")}</div>
              <div className="service-block-title">
                <p className="technical"><DynamicText text={service.title}/></p>
                <h2><DynamicText text={service.value}/></h2>
                <p><DynamicText text={service.description}/></p>
              </div>
              <div className="service-block-detail">
                <div>
                  <span className="technical"><T id="services.bestFit"/></span>
                  <p><DynamicText text={detail.bestFor}/></p>
                </div>
                <div>
                  <span className="technical"><T id="services.typicalScope"/></span>
                  <ul>
                    {detail.includes.map(item => <li key={item}><DynamicText text={item}/></li>)}
                  </ul>
                </div>
                <div className="service-node-row">
                  {service.nodes.map(node => <span key={node}><DynamicText text={node}/></span>)}
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
              <p className="eyebrow"><T id="services.howTheStudioWorks"/></p>
              <h2><T id="services.customDoesNotMeanChaotic"/></h2>
            </div>
            <p> <T id="services.theProcessIsStructuredEnoughToProtectQualityBut"/> </p>
          </div>
          <div className="services-principle-grid">
            {engagementPrinciples.map((principle, index) => (
              <article key={principle.title}>
                <span className="technical">{String(index + 1).padStart(2, "0")}</span>
                <h3><DynamicText text={principle.title}/></h3>
                <p><DynamicText text={principle.copy}/></p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container services-process" aria-labelledby="services-process-title">
        <div>
          <p className="eyebrow"><T id="services.deliverySystem"/></p>
          <h2 id="services-process-title"><T id="services.fiveDeliberateMoves"/></h2>
          <p> <T id="services.theSameCoreProcessAdaptsToAFocusedWebsite"/> </p>
        </div>
        <ol>
          {processStages.map((stage, index) => (
            <li key={stage.id}>
              <span className="technical">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3><DynamicText text={stage.title}/></h3>
                <p><DynamicText text={stage.what}/></p>
                <small><DynamicText text={stage.deliverable}/></small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="container services-cta">
        <div>
          <p className="eyebrow"><T id="services.notSureWhichServiceFits"/></p>
          <h2><T id="services.startWithTheProblemNotThePackage"/></h2>
          <p> <T id="services.sendTheBusinessGoalCurrentSituationAndWhatYou"/> </p>
        </div>
        <div>
          <Link className="action action-solid" href="/start-a-project"><T id="services.buildTheBrief"/> <span aria-hidden>↗</span></Link>
          <Link className="action" href="/work"><T id="services.seeSelectedWork"/> <span aria-hidden>↗</span></Link>
        </div>
      </section>
    </div>
  );
}
