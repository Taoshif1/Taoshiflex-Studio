import type { Language } from "./config";
import { en } from "./translations/en";
import { bn, catalog } from "./translations/bn";

const sourceKeys = new Map(Object.entries(en).map(([key, value]) => [value, key]));

export function translate(language: Language, key: string) {
  return (language === "bn" ? bn[key] : undefined) ?? en[key] ?? key;
}

export function translateText(language: Language, text: string, slug?: string) {
  if (language === "en" || !text) return text;
  const catalogTranslation = slug ? catalog[slug]?.[text] : undefined;
  if (catalogTranslation) return catalogTranslation;
  const key = sourceKeys.get(text);
  return key ? bn[key] ?? text : text;
}
