"use client";
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
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
const LanguageContext = createContext({ language: "en" as Language, setLanguage: (_language: Language) => {}, privatePage: false });
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const privatePage = /^\/(client|studio-admin)(\/|$)/.test(pathname);
  const saved = useSyncExternalStore(subscribe, readPreference, english);
  const [selection, setSelection] = useState<Language | null>(null);
  const language = privatePage ? "en" : selection ?? saved;
  function setLanguage(next: Language) {
    setSelection(next);
    try { localStorage.setItem(languageStorageKey, next); } catch { /* In-memory switching still works. */ }
  }
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage, privatePage }}><div className="language-root" data-language={language} lang={language}>{children}</div></LanguageContext.Provider>;
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  return { ...context, t: (key: string) => translate(context.language, key), text: (value: string, slug?: string) => translateText(context.language, value, slug) };
}
export function LanguageToggle() {
  const { language, setLanguage, privatePage } = useLanguage();
  if (privatePage) return null;
  return <div className="language-toggle" role="group" aria-label="Language / ভাষা"><button type="button" lang="en" aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</button><button type="button" lang="bn" aria-label="বাংলা" aria-pressed={language === "bn"} onClick={() => setLanguage("bn")}>বাংলা</button></div>;
}
export function T({ id }: { id: string }) { const { t } = useLanguage(); return <>{t(id)}</>; }
export function DynamicText({ text: value, slug }: { text: string; slug?: string }) { const { text } = useLanguage(); return <>{text(value, slug)}</>; }
export function PolicyLanguageNote() { const { language } = useLanguage(); return language === "bn" ? <p className="policy-language-note">এই নীতিমালার অফিসিয়াল সংস্করণ ইংরেজিতে দেওয়া হয়েছে।</p> : null; }
