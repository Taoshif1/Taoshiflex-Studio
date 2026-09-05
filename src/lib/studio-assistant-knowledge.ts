import "server-only";

import { capabilities, processStages, site } from "@/content/site";
import { currentVersion, getPublicPolicies } from "@/lib/policies";
import {
  getActivePackages,
  getAssistantSettings,
  getPublishedProjects,
  getStudioPresence,
} from "@/lib/studio-data";
import type { AssistantSettings } from "@/types/content";

const bounded = (value: string | undefined, maximum = 1_200) =>
  (value ?? "").trim().slice(0, maximum);

export type PublicStudioAssistantKnowledge = {
  studio: {
    name: string;
    description: string;
    location: string;
    availability: string;
    contactEmail: string;
    bookingUrl: string | null;
    startProjectUrl: string;
  };
  services: Array<{
    title: string;
    value: string;
    description: string;
    capabilities: string[];
  }>;
  process: Array<{
    title: string;
    what: string;
    why: string;
    deliverable: string;
  }>;
  activePackages: Array<{
    name: string;
    category: string;
    priceFrom: number | null;
    currency: string;
    description: string;
    features: string[];
    deliveryEstimate: string;
    revisions: string | null;
    support: string | null;
  }>;
  publishedProjects: Array<{
    name: string;
    category: string;
    status: string;
    summary: string;
    context: string;
    challenge: string;
    approach: string;
    solution: string;
    result: string;
    capabilities: string[];
    features: string[];
  }>;
  publicPolicies: Array<{
    title: string;
    summary: string;
    url: string;
  }>;
};

export type PublicStudioAssistantContext = {
  settings: AssistantSettings;
  knowledge: PublicStudioAssistantKnowledge;
};

export async function getPublicStudioAssistantContext(): Promise<PublicStudioAssistantContext> {
  const [settings, packages, projects, presence, policies] = await Promise.all([
    getAssistantSettings(),
    getActivePackages(),
    getPublishedProjects(),
    getStudioPresence(),
    getPublicPolicies(),
  ]);
  const allowed = new Set(settings.knowledgeCategories);

  return {
    settings,
    knowledge: {
      studio: {
        name: site.name,
        description: site.description,
        location: presence.location,
        availability: presence.availability,
        contactEmail: presence.email,
        bookingUrl: presence.bookingEnabled ? presence.bookingUrl : null,
        startProjectUrl: settings.leadCapture ? settings.handoffUrl : "/start-a-project",
      },
      services: allowed.has("services")
        ? capabilities.map(({ title, value, description, nodes }) => ({
            title,
            value,
            description,
            capabilities: nodes,
          }))
        : [],
      process: allowed.has("process")
        ? processStages.map(({ title, what, why, deliverable }) => ({
            title,
            what,
            why,
            deliverable,
          }))
        : [],
      activePackages:
        allowed.has("pricing") && settings.showPricing
          ? packages.map((item) => ({
              name: item.name,
              category: item.category,
              priceFrom: item.priceFrom,
              currency: item.currency,
              description: bounded(item.description, 500),
              features: item.features.slice(0, 12).map((feature) => bounded(feature, 200)),
              deliveryEstimate: bounded(item.deliveryEstimate, 160),
              revisions: bounded(item.revisions, 100) || null,
              support: bounded(item.support, 160) || null,
            }))
          : [],
      publishedProjects: allowed.has("projects")
        ? projects.slice(0, 24).map((project) => ({
            name: project.name,
            category: project.category,
            status: project.status,
            summary: bounded(project.summary, 600),
            context: bounded(project.context),
            challenge: bounded(project.challenge),
            approach: bounded(project.approach),
            solution: bounded(project.solution),
            result: bounded(project.result),
            capabilities: project.capabilities.slice(0, 16).map((item) => bounded(item, 180)),
            features: project.features.slice(0, 20).map((item) => bounded(item, 180)),
          }))
        : [],
      publicPolicies: policies.slice(0, 12).map((policy) => {
        const version = currentVersion(policy);
        return {
          title: bounded(version.title, 160),
          summary: bounded(version.summary, 600),
          url: `/policies/${policy.slug}`,
        };
      }),
    },
  };
}
