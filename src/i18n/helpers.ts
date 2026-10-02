import type { Language } from "./config";
import { en } from "./translations/en";
import { bn, bnSource, catalog } from "./translations/bn";

export function translate(language: Language, key: string) {
  return (language === "bn" ? bn[key] : undefined) ?? en[key] ?? key;
}

export function translateText(language: Language, text: string, slug?: string) {
  if (language === "en" || !text) return text;
  const entries = slug && Object.hasOwn(catalog, slug) ? catalog[slug] : undefined;
  const catalogTranslation = entries && Object.hasOwn(entries, text) ? entries[text] : undefined;
  if (catalogTranslation) return catalogTranslation;
  return Object.hasOwn(bnSource, text) ? bnSource[text] : text;
}
