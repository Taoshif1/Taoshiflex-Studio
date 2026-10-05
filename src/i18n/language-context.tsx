"use client";
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { trackPublicEvent } from "@/lib/public-analytics";
import { usePathname } from "next/navigation";
import { languageStorageKey, parseLanguage, type Language } from "./config";
import { translate, translateText } from "./helpers";

function readPreference(): Language {
  try { return parseLanguage(localStorage.getItem(languageStorageKey)); }
  catch { return "en"; }
}
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  return () => window.removeEventListener("storage", notify);
}
const english = (): Language => "en";
const subscribeToContext = () => () => {};
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void; privatePage: boolean }>({ language: "en", setLanguage: () => {}, privatePage: false });
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const privatePage = /^\/(client|studio-admin)(\/|$)/.test(pathname);
  const saved = useSyncExternalStore(subscribe, readPreference, english);
  const [selection, setSelection] = useState<Language | null>(null);
  const language = privatePage ? "en" : selection ?? saved;
  function setLanguage(next: Language) {
    setSelection(next);
    if (next !== language) trackPublicEvent("language_change", { language: next });
    try { localStorage.setItem(languageStorageKey, next); } catch { /* In-memory switching still works. */ }
  }
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage, privatePage }}><div className="language-root" data-language={language} lang={language}>{children}</div></LanguageContext.Provider>;
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  // A streamed Suspense child can hydrate after the provider reads localStorage.
  // Keep that child's first render consistent with its English server HTML.
  const language = useSyncExternalStore(subscribeToContext, () => context.language, english);
  return { ...context, language, t: (key: string) => translate(language, key), text: (value: string, slug?: string) => translateText(language, value, slug) };
}
export function LanguageToggle() {
  const { language, setLanguage, privatePage } = useLanguage();
  if (privatePage) return null;
  return (
    <button
      type="button"
      className="language-toggle"
      role="switch"
      aria-checked={language === "bn"}
      aria-label="Bangla language / বাংলা ভাষা"
      onClick={() => setLanguage(language === "en" ? "bn" : "en")}
    >
      <span lang="en" aria-hidden="true">EN</span>
      <span lang="bn" aria-hidden="true">বাংলা</span>
    </button>
  );
}
export function T({ id }: { id: string }) { const { t } = useLanguage(); return <>{t(id)}</>; }
export function DynamicText({ text: value, slug }: { text: string; slug?: string }) { const { text } = useLanguage(); return <>{text(value, slug)}</>; }
export function PolicyLanguageNote() { const { language } = useLanguage(); return language === "bn" ? <p className="policy-language-note">এই নীতিমালার অফিসিয়াল সংস্করণ ইংরেজিতে দেওয়া হয়েছে।</p> : null; }
