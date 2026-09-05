export const ASSISTANT_MAX_QUESTION_LENGTH = 600;
export const ASSISTANT_MAX_HISTORY_MESSAGES = 10;
export const ASSISTANT_MAX_HISTORY_TEXT_LENGTH = 1_200;
export const ASSISTANT_CLIENT_FAILURE_REPLY =
  "Studio guidance could not be reached just now. Please try again, or use Start a Project when you are ready to share a project brief.";

export type PublicAssistantMessage = {
  role: "assistant" | "user";
  text: string;
};

export type AssistantRequest = {
  question: string;
  history: PublicAssistantMessage[];
};

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
