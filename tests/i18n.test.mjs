import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { loadTs } from "./security-loader.mjs";

const { parseLanguage } = loadTs("src/i18n/config.ts");
const { translate, translateText } = loadTs("src/i18n/helpers.ts");
const { inquirySteps } = loadTs("src/lib/inquiry-config.ts");
const { en } = loadTs("src/i18n/translations/en.ts");
const { bn } = loadTs("src/i18n/translations/bn.ts");

test("language parser defaults safely to English", () => {
  assert.equal(parseLanguage("bn"), "bn");
  assert.equal(parseLanguage("en"), "en");
  assert.equal(parseLanguage("unexpected"), "en");
  assert.equal(parseLanguage(null), "en");
});

test("shared navigation has a Bangla translation", () => {
  assert.equal(translate("en", "nav.startAProject"), "Start a Project");
  assert.equal(translate("bn", "nav.startAProject"), "প্রজেক্ট শুরু করুন");
});

test("Bangla dictionary covers every shared English translation key", () => {
  assert.deepEqual(Object.keys(bn).sort(), Object.keys(en).sort());
  for (const key of Object.keys(en)) assert.equal(typeof bn[key], "string", key);
});

test("known catalog content translates and unknown content falls back to English", () => {
  const source = "Reusable career data, targeted resume variants and ATS-friendly PDF export for developers.";
  const translated = translateText("bn", source, "personacv");
  assert.notEqual(translated, source);
  assert.match(translated, /[\u0980-\u09ff]/);
  assert.equal(translateText("bn", "Future CMS copy", "future-product"), "Future CMS copy");
});

test("translated inquiry labels do not mutate stable backend values", () => {
  const projectType = inquirySteps[0];
  assert.equal(projectType.id, "projectType");
  assert.ok(projectType.options.includes("Business Website"));
  assert.equal(translateText("bn", "Business Website"), "ব্যবসার ওয়েবসাইট");
  assert.equal(projectType.options[0], "Business Website");
});

test("pricing features use a real marker column rather than an overlapping pseudo-element", () => {
  const component = readFileSync(new URL("../src/components/pricing/pricing-content.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/app/pricing/pricing.css", import.meta.url), "utf8");
  assert.match(component, /pricing-feature-mark/);
  assert.match(css, /grid-template-columns:1rem minmax\(0,1fr\)/);
  assert.doesNotMatch(css, /\.pricing-grid li::before/);
});


test("secondary public UI is wired through localization", () => {
  const loading = readFileSync(new URL("../src/app/loading.tsx", import.meta.url), "utf8");
  const reviews = readFileSync(new URL("../src/components/reviews/review-marquee.tsx", import.meta.url), "utf8");
  const xSystem = readFileSync(new URL("../src/components/home/x-system.tsx", import.meta.url), "utf8");
  const mediaViewer = readFileSync(new URL("../src/components/work/project-media-viewer.tsx", import.meta.url), "utf8");
  assert.match(loading, /global\.loadingSystem/);
  assert.match(reviews, /reviews\.clientPerspectives/);
  assert.match(xSystem, /home\.x\.idea/);
  assert.match(mediaViewer, /media\.previous/);
});

test("Bangla navigation breakpoint does not alter English desktop layout", () => {
  const css = readFileSync(new URL("../src/i18n/language.css", import.meta.url), "utf8");
  assert.match(css, /@media\(max-width:1199px\)\{\[data-language="bn"\] \.site-header \.desktop-nav/);
  assert.doesNotMatch(css, /@media\(max-width:1199px\)\{\.site-header \.desktop-nav/);
});


test("language control is one native keyboard-operable switch", () => {
  const source = readFileSync(new URL("../src/i18n/language-context.tsx", import.meta.url), "utf8");
  const toggle = source.slice(source.indexOf("export function LanguageToggle"), source.indexOf("export function T("));
  assert.equal((toggle.match(/<button\b/g) || []).length, 1);
  assert.match(toggle, /role="switch"/);
  assert.match(toggle, /aria-checked=\{language === "bn"\}/);
  assert.match(toggle, /type="button"/);
  assert.doesNotMatch(toggle, /aria-pressed|role="group"/);
  const css = readFileSync(new URL("../src/i18n/language.css", import.meta.url), "utf8");
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /language-toggle:focus-visible/);
  assert.match(css, /menu-button\[aria-expanded="true"\]\{display:block\}/);
});

test("all inquiry option translations preserve the source configuration", () => {
  const before = JSON.stringify(inquirySteps);
  for (const step of inquirySteps) for (const value of step.options) {
    assert.equal(translateText("en", value), value);
    assert.ok(translateText("bn", value).trim());
  }
  assert.equal(JSON.stringify(inquirySteps), before);
});

test("new wording on an existing CMS slug never receives an unrelated translation", () => {
  assert.equal(translateText("bn", "A newly revised offer", "one-page-website"), "A newly revised offer");
  assert.equal(translateText("bn", "A newly revised summary", "redflint"), "A newly revised summary");
  for (const [key, value] of Object.entries(bn)) assert.ok(value.trim(), key);
  assert.notEqual(translateText("bn", "Dismiss notification"), "Dismiss notification");
});


test("exact-source pricing copy is reachable even without a keyed English entry", () => {
  assert.equal(translateText("bn", "Recommended"), "প্রস্তাবিত");
  assert.equal(translateText("bn", "Starting from"), "শুরু");
  assert.equal(translateText("bn", "Discuss this scope"), "এই প্যাকেজ নিয়ে কথা বলুন");
  const { deliveryStages, comparisonRows, quoteFactors } = loadTs("src/content/pricing-translations.ts");
  const { bnSource } = loadTs("src/i18n/translations/bn.ts");
  for (const value of [...deliveryStages.flatMap(({ title, copy, output }) => [title, copy, output]), ...comparisonRows.flatMap(Object.values), ...quoteFactors]) {
    assert.ok(Object.hasOwn(bnSource, value), value);
    assert.equal(translateText("bn", value), bnSource[value]);
    assert.equal(translateText("en", value), value);
  }
  assert.equal(translateText("bn", "constructor"), "constructor");
  assert.equal(translateText("bn", "constructor", "personacv"), "constructor");
  assert.equal(translateText("bn", "Unknown copy", "__proto__"), "Unknown copy");
});
