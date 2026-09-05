export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const MODEL_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/i;

export function resolveGeminiModel(value: string | undefined) {
  const requested = value?.trim();
  return requested && MODEL_PATTERN.test(requested) ? requested : DEFAULT_GEMINI_MODEL;
}
