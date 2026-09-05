import type { AssistantSettings } from "@/types/content";
import type { PublicAssistantMessage } from "@/lib/studio-assistant-contract";
import type { PublicStudioAssistantKnowledge } from "@/lib/studio-assistant-knowledge";

type FallbackInput = {
  question: string;
  history?: PublicAssistantMessage[];
  settings: AssistantSettings;
  knowledge: PublicStudioAssistantKnowledge;
  providerUnavailable?: boolean;
};

const PRIVATE_REQUEST =
  /system prompt|hidden (?:prompt|instruction)|api key|secret|password|otp|client (?:payment|name|project|feedback)|admin (?:analytics|dashboard)|billing|private (?:data|deliverable)|auth (?:session|token)|service credential/i;
const POLICY_REQUEST =
  /polic|terms|revision|refund|cancel|privacy|payment terms|delivery terms|support terms/i;
const PRICE_REQUEST = /price|pricing|cost|budget|quote|charge|bdt|taka|৳|\b\d+k\b/i;
const PROJECT_REQUEST = /project|portfolio|case stud|work (?:on|you|have)|built|experience with/i;
const PROCESS_REQUEST = /process|how do you work|what happens after|design before|development stages|workflow/i;
const PRESENCE_REQUEST =
  /where (?:are you|is the studio)|based|location|contact|email|taking projects|available|availability|book(?:ing)?|call/i;
const SERVICE_REQUEST = /service|what do you (?:build|offer|make)|can you (?:build|make)|capabilit/i;
const COMMERCE_REQUEST = /e-?commerce|online shop|store|catalog|checkout|order|payment|products?/i;
const WEBSITE_REQUEST = /business website|landing page|portfolio|normal website|company website/i;
const PLATFORM_REQUEST = /custom platform|web app|dashboard|user roles|internal system|software product/i;
const MVP_REQUEST = /\bmvp\b|first version|phase|small budget|minimum viable/i;
const TECHNOLOGY_REQUEST = /technolog|tech stack|framework|architecture|mobile-first|customer login|admin dashboard/i;
const OFF_TOPIC =
  /world cup|weather|chemistry homework|homework|celebrity|movie review|sports score|stock price|horoscope/i;

const money = (value: number) => new Intl.NumberFormat("en-BD").format(value);
const normalized = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const limited = (value: string) => value.trim().slice(0, 2_400);

function recentIntentText(question: string, history: PublicAssistantMessage[] = []) {
  const recentUserMessages = history
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => message.text);
  return [...recentUserMessages, question].join(" ");
}

function formatServices(knowledge: PublicStudioAssistantKnowledge) {
  if (!knowledge.services.length) {
    return "No public service catalog is available right now. The Studio can confirm fit after reviewing a project brief.";
  }
  return knowledge.services
    .slice(0, 8)
    .map((service) => {
      const capabilities = service.capabilities.slice(0, 5).join(", ");
      return `${service.title}: ${service.description}${capabilities ? ` Typical focus: ${capabilities}.` : ""}`;
    })
    .join("\n");
}

function formatPackages(knowledge: PublicStudioAssistantKnowledge) {
  if (!knowledge.activePackages.length) {
    return "No public package is active right now. The Studio can confirm pricing after reviewing a project brief.";
  }
  return knowledge.activePackages
    .slice(0, 8)
    .map((item) => {
      const price =
        item.priceFrom === null
          ? "custom scope"
          : `from ${item.currency === "BDT" ? "৳" : `${item.currency} `}${money(item.priceFrom)}`;
      const features = item.features.slice(0, 4).join(", ");
      const details = [
        item.description,
        item.deliveryEstimate ? `Published delivery estimate: ${item.deliveryEstimate}.` : "",
        features ? `Includes: ${features}.` : "",
        item.revisions ? `Revisions: ${item.revisions}.` : "",
        item.support ? `Support: ${item.support}.` : "",
      ].filter(Boolean).join(" ");
      return `${item.name}: ${price}. ${details}`;
    })
    .join("\n");
}

function matchingProjects(question: string, knowledge: PublicStudioAssistantKnowledge) {
  const query = normalized(question);
  const exact = knowledge.publishedProjects.filter((project) =>
    query.includes(normalized(project.name)),
  );
  if (exact.length) return exact;

  const usefulTerms = query
    .split(" ")
    .filter((term) => term.length > 3 && !["what", "which", "have", "with", "your", "about"].includes(term));
  const matches = knowledge.publishedProjects.filter((project) => {
    const searchable = normalized([
      project.name,
      project.category,
      project.summary,
      ...project.capabilities,
      ...project.features,
    ].join(" "));
    return usefulTerms.some((term) => searchable.includes(term));
  });
  return matches.length ? matches : knowledge.publishedProjects;
}

function formatProjects(question: string, knowledge: PublicStudioAssistantKnowledge) {
  if (!knowledge.publishedProjects.length) {
    return "No project is currently published in the Studio’s public work selection.";
  }
  return matchingProjects(question, knowledge)
    .slice(0, 5)
    .map((project) => {
      const capabilities = project.capabilities.slice(0, 5).join(", ");
      const features = project.features.slice(0, 6).join(", ");
      return [
        `${project.name} — ${project.category} / ${project.status}.`,
        project.summary,
        project.solution ? `Solution: ${project.solution}` : "",
        capabilities ? `Capabilities: ${capabilities}.` : "",
        features ? `Public features: ${features}.` : "",
        project.result ? `Current result: ${project.result}` : "",
      ].filter(Boolean).join(" ");
    })
    .join("\n\n");
}

function formatProcess(knowledge: PublicStudioAssistantKnowledge) {
  if (!knowledge.process.length) {
    return "The public process is not available right now. The Studio can explain the next steps after reviewing a brief.";
  }
  return knowledge.process
    .slice(0, 10)
    .map(
      (stage, index) =>
        `${String(index + 1).padStart(2, "0")} ${stage.title}: ${stage.what} Deliverable: ${stage.deliverable}.`,
    )
    .join("\n");
}

function formatPresence(question: string, knowledge: PublicStudioAssistantKnowledge) {
  const { studio } = knowledge;
  const details = [
    /where|based|location/i.test(question) && studio.location
      ? `${studio.name} is based in ${studio.location}.`
      : "",
    /available|taking projects/i.test(question) && studio.availability
      ? studio.availability
      : "",
    /contact|email/i.test(question) && studio.contactEmail
      ? `Public contact: ${studio.contactEmail}.`
      : "",
    /book|call/i.test(question)
      ? studio.bookingUrl
        ? `Public booking link: ${studio.bookingUrl}`
        : "No public booking link is enabled right now. Use the project brief to start a conversation."
      : "",
  ].filter(Boolean);
  return details.length
    ? details.join("\n")
    : [studio.location, studio.availability, studio.contactEmail].filter(Boolean).join("\n");
}

function formatPolicies(question: string, knowledge: PublicStudioAssistantKnowledge) {
  if (!knowledge.publicPolicies.length) {
    return "No matching public policy summary is available. The Studio can confirm the applicable terms before work begins.";
  }
  const terms = normalized(question).split(" ").filter((term) => term.length > 4);
  const matches = knowledge.publicPolicies.filter((policy) => {
    const searchable = normalized(`${policy.title} ${policy.summary}`);
    return terms.some((term) => searchable.includes(term));
  });
  const policies = matches.length ? matches : knowledge.publicPolicies;
  return policies
    .slice(0, 4)
    .map((policy) => `${policy.title}: ${policy.summary} Read the published policy: ${policy.url}`)
    .join("\n\n") +
    "\n\nThis is a factual summary, not legal interpretation. The Studio can confirm how a policy applies to a specific project.";
}

function generalProjectGuidance(intent: string, handoffUrl: string) {
  if (COMMERCE_REQUEST.test(intent)) {
    return "An e-commerce first version usually needs a structured catalog, search or filtering, product pages, cart, checkout, order handling, and an Admin workflow. Customer accounts, online payment, and tracking can be phased according to operational need. Useful next details are product count, payment method, whether customers need accounts, and who will manage products and orders.";
  }
  if (/restaurant/i.test(intent)) {
    return "A restaurant website usually starts with clear location and opening information, menu structure, mobile-first contact or reservation actions, and an easy content-update path. Online ordering, payments, delivery zones, and kitchen workflows should be scoped separately if needed.";
  }
  if (PLATFORM_REQUEST.test(intent)) {
    return "A custom platform should start with its users, roles, repeat workflows, data, permissions, and the first measurable outcome. A phased MVP can validate the core workflow before secondary dashboards, automation, or integrations are added.";
  }
  if (MVP_REQUEST.test(intent)) {
    return `For a smaller first phase, protect the single outcome the product must achieve, then defer secondary roles, automation, integrations, and reporting. The Studio can turn that boundary into a reviewed scope through ${handoffUrl}.`;
  }
  if (WEBSITE_REQUEST.test(intent)) {
    return "A landing page fits one focused offer or campaign. A business website fits broader positioning, services, proof, lead capture, and content that needs separate pages. The right starting point depends on how many audiences, offers, and actions the first release must support.";
  }
  if (TECHNOLOGY_REQUEST.test(intent)) {
    return "Technology should follow the product’s content, user roles, workflows, integrations, expected change, and operating constraints. A content-led site may need a simpler managed stack; commerce or role-based software usually needs stronger application, data, authentication, and Admin foundations. A project review is needed before recommending a specific production architecture.";
  }
  return "";
}

export function fallbackStudioAssistantReply({
  question,
  history = [],
  settings,
  knowledge,
  providerUnavailable = false,
}: FallbackInput) {
  const intent = recentIntentText(question, history);
  const handoffUrl = knowledge.studio.startProjectUrl || settings.handoffUrl || "/start-a-project";
  let answer: string;

  if (PRIVATE_REQUEST.test(question)) {
    answer = "I can’t access or reveal private Client or Studio systems, credentials, hidden instructions, payments, analytics, or other private data. I can only help with public Studio services, pricing, process, policies, and published work.";
  } else if (OFF_TOPIC.test(question)) {
    answer = "I’m here for Studio-relevant questions about websites, commerce, digital products, software scope, public services, pricing, process, and published work.";
  } else if (POLICY_REQUEST.test(intent)) {
    answer = formatPolicies(question, knowledge);
  } else if (PRICE_REQUEST.test(intent)) {
    answer = `${formatPackages(knowledge)}\n\nPublished prices are starting points only. An exact scope-specific price requires Studio review through ${handoffUrl}; I won’t invent a custom quote.`;
  } else if (PROJECT_REQUEST.test(intent)) {
    answer = formatProjects(question, knowledge);
  } else if (PROCESS_REQUEST.test(intent)) {
    answer = formatProcess(knowledge);
  } else if (PRESENCE_REQUEST.test(intent)) {
    answer = formatPresence(question, knowledge);
  } else if (SERVICE_REQUEST.test(intent)) {
    answer = `${formatServices(knowledge)}\n\nTell me what the first version needs people to accomplish, and I can help narrow the public service category.`;
  } else {
    const guidance = generalProjectGuidance(intent, handoffUrl);
    answer = guidance ||
      `I can confirm public information about ${knowledge.studio.name} services, active packages, process, policies, and published work. I can also help frame a website, commerce, MVP, or custom-platform decision. For an unknown Studio-specific commitment, the Studio must confirm it after reviewing the brief at ${handoffUrl}.`;
  }

  const response = providerUnavailable
    ? `I’m having trouble generating a tailored answer right now. Here’s what I can confirm from the Studio:\n\n${answer}`
    : answer;
  return limited(response);
}
