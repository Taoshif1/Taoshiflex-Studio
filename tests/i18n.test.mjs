import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseLanguage } from "../src/i18n/config.ts";
import { translate, translateText } from "../src/i18n/helpers.ts";
import { inquirySteps } from "../src/lib/inquiry-config.ts";

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
