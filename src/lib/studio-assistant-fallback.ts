import type { AssistantSettings, ServicePackage } from "@/types/content";

export const ASSISTANT_MAX_QUESTION_LENGTH = 600;
export const ASSISTANT_MAX_HISTORY_MESSAGES = 10;
export const ASSISTANT_MAX_HISTORY_TEXT_LENGTH = 1_200;

export type PublicAssistantMessage = {
  role: "assistant" | "user";
  text: string;
};

export type AssistantRequest = {
  question: string;
  history: PublicAssistantMessage[];
};

const money = (value: number) => new Intl.NumberFormat("en-BD").format(value);

export function parseAssistantRequest(value: unknown): AssistantRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "question" && key !== "history")) return null;
  if (typeof input.question !== "string" || !Array.isArray(input.history)) return null;
  const question = input.question.trim();
  if (!question || question.length > ASSISTANT_MAX_QUESTION_LENGTH) return null;
  if (input.history.length > ASSISTANT_MAX_HISTORY_MESSAGES) return null;

  let totalLength = question.length;
  const history: PublicAssistantMessage[] = [];
  let expectedRole: PublicAssistantMessage["role"] = "user";
  for (const entry of input.history) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const message = entry as Record<string, unknown>;
    if (
      (message.role !== "assistant" && message.role !== "user") ||
      typeof message.text !== "string"
    ) return null;
    if (message.role !== expectedRole) return null;
    const text = message.text.trim();
    if (!text || text.length > ASSISTANT_MAX_HISTORY_TEXT_LENGTH) return null;
    totalLength += text.length;
    if (totalLength > 6_000) return null;
    history.push({ role: message.role, text });
    expectedRole = expectedRole === "user" ? "assistant" : "user";
  }

  return { question, history };
}

export function fallbackStudioAssistantReply(
  input: string,
  settings: AssistantSettings,
  packages: ServicePackage[],
  providerUnavailable = false,
) {
  let answer: string;
  if (/system prompt|api key|secret|password|client payment|admin analytics|private data/i.test(input)) {
    answer = "I can’t access or reveal private Client or Studio systems, credentials, or hidden instructions. I can only help with the Studio’s public services, pricing, process and published work.";
  } else if (
    settings.knowledgeCategories.includes("pricing") &&
    settings.showPricing &&
    /price|pricing|cost|budget|bdt|taka|\b\d+k\b/i.test(input)
  ) {
    answer = packages.length
      ? packages
          .map((item) =>
            `${item.name}: ${item.priceFrom === null ? "custom quote" : `from ৳${money(item.priceFrom)}`}`,
          )
          .join("\n") +
        "\n\nPublished package prices are starting points. A scope-specific quote requires a project review."
      : "No public package is active right now. Use the project brief for a scope-specific conversation.";
  } else if (
    settings.knowledgeCategories.includes("services") &&
    /service|business|website|time|long|delivery|week|start/i.test(input)
  ) {
    if (/service/i.test(input)) {
      answer = "Taoshiflex Studio builds business websites, e-commerce systems, custom platforms and digital products. Tell me what your business needs people to do online, and I can help narrow the fit.";
    } else if (/business|website/i.test(input)) {
      answer = "A business website can combine positioning, service pages, lead capture, responsive design and an editable content foundation. Final scope follows the brief.";
    } else {
      answer = packages.length
        ? packages.map((item) => `${item.name}: ${item.deliveryEstimate}`).join("\n")
        : "Delivery timing is confirmed after scope review.";
    }
  } else if (
    settings.knowledgeCategories.includes("services") &&
    /e-commerce|ecommerce|shop|commerce|store|payment|product/i.test(input)
  ) {
    answer = "Commerce work can include catalog, search, cart, checkout, cash on delivery and payment setup where verified merchant accounts are available. Courier API work is separately scoped.";
  } else if (
    settings.knowledgeCategories.includes("process") &&
    /process|work|how/i.test(input)
  ) {
    answer = "The Studio moves through discovery, direction, design, build and launch. Each stage reduces ambiguity before engineering effort compounds.";
  } else if (
    settings.knowledgeCategories.includes("projects") &&
    /project|portfolio|case|done|built/i.test(input)
  ) {
    answer = "Selected work contains only admin-curated, published projects. In-progress work is labelled honestly and avoids unverified performance claims.";
  } else {
    answer = "I can answer from the Studio’s approved services, active pricing, process and published-work knowledge. For a project-specific answer, send a brief.";
  }

  return providerUnavailable
    ? `I’m having trouble generating a tailored answer right now. Here’s what I can confirm from the Studio:\n\n${answer}`
    : answer;
}
