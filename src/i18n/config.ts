export type Language = "en" | "bn";
export const languageStorageKey = "taoshiflex-language";
export function parseLanguage(value: unknown): Language { return value === "bn" ? "bn" : "en"; }
