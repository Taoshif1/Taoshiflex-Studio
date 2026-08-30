import type { Capability, ProcessStage, SiteSettings } from "@/types/content";

export const site: SiteSettings = { name: "Taoshiflex Studio", description: "Strategy, design and engineering for ambitious businesses.", url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://taoshiflex.com", location: "Dhaka, Bangladesh", email: "hello@taoshiflex.com" };

export const capabilities: Capability[] = [
  { id: "websites", number: "01", title: "Business Websites", value: "Build a credible digital presence that turns attention into action.", description: "Positioning, content structure and conversion-focused experiences for businesses ready to be taken seriously.", nodes: ["Brand", "Content", "Trust", "Conversion"] },
  { id: "commerce", number: "02", title: "E-Commerce Systems", value: "Create a dependable way to sell, serve and operate online.", description: "Customer journeys and operational tools designed as one connected commerce system.", nodes: ["Catalog", "Checkout", "Orders", "Admin"] },
  { id: "platforms", number: "03", title: "Custom Platforms", value: "Turn complicated operations into clear, useful systems.", description: "Purpose-built software for teams, workflows and business processes that generic tools cannot fit.", nodes: ["Users", "Workflow", "Data", "Operations"] },
  { id: "products", number: "04", title: "Digital Products", value: "Launch a new service with product thinking built in.", description: "From an early idea to a coherent, testable product experience engineered to evolve.", nodes: ["Product", "Interface", "System", "Growth"] },
];

export const processStages: ProcessStage[] = [
  { id: "discover", title: "Discover", what: "We clarify the problem, audience and commercial context.", why: "The right direction prevents expensive noise later.", deliverable: "Shared brief + priorities" },
  { id: "design", title: "Design", what: "We shape the system, content and interface together.", why: "Clarity has to work before it can look effortless.", deliverable: "Experience direction + prototype" },
  { id: "engineer", title: "Engineer", what: "We build resilient, responsive software with care.", why: "The experience must survive real people and real operations.", deliverable: "Production-ready system" },
  { id: "launch", title: "Launch", what: "We verify, refine and release with a measured plan.", why: "A controlled launch protects quality and confidence.", deliverable: "Verified public release" },
  { id: "grow", title: "Grow", what: "We learn from use and improve what matters next.", why: "Strong digital products are operated, not abandoned.", deliverable: "Improvement roadmap" },
];
