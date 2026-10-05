import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = path => readFileSync(path, "utf8");

test("public navigation resets scroll before streamed route fallbacks render", () => {
  const layout = source("src/app/(public)/layout.tsx");
  const reset = source("src/components/global/public-navigation-scroll-reset.tsx");

  assert.match(layout, /PublicNavigationScrollReset/);
  assert.match(reset, /addEventListener\("click", handleNavigationClick, true\)/);
  assert.match(reset, /nextUrl\.origin !== window\.location\.origin/);
  assert.match(reset, /event\.metaKey/);
  assert.match(reset, /href\.startsWith\("#"\)/);
  assert.match(reset, /const sameLocation/);
  assert.match(reset, /document\.documentElement\.scrollTop = 0/);
  assert.match(reset, /document\.body\.scrollTop = 0/);
  assert.match(reset, /removeEventListener\("click", handleNavigationClick, true\)/);
});
