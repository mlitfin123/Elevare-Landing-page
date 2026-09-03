import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();
const logbookPage = fs.readFileSync(path.join(projectRoot, "app", "logbook", "page.tsx"), "utf8");
const styles = fs.readFileSync(path.join(projectRoot, "app", "globals.css"), "utf8");

test("Logbook product page includes a responsive privacy-enhanced demo video", () => {
  assert.match(logbookPage, /See Logbook in Action/);
  assert.match(
    logbookPage,
    /See how Logbook helps you track your nutrition, build workouts, log your training, and follow your progress\./,
  );
  assert.match(logbookPage, /https:\/\/www\.youtube-nocookie\.com\/embed\/Stqu2-1rN_8/);
  assert.match(logbookPage, /title="Logbook fitness tracker app walkthrough"/);
  assert.match(logbookPage, /loading="lazy"/);
  assert.doesNotMatch(logbookPage, /youtube\.com\/shorts\/Stqu2-1rN_8|autoplay=1/);
  assert.ok(logbookPage.indexOf("product-hero") < logbookPage.indexOf("logbook-demo"));
  assert.ok(logbookPage.indexOf("logbook-demo") < logbookPage.indexOf("grid-3"));
  assert.match(styles, /\.logbook-video-frame\s*{[\s\S]*width:\s*min\(100%,\s*440px\)[\s\S]*aspect-ratio:\s*9\s*\/\s*16/);
  assert.match(styles, /\.logbook-video-frame iframe\s*{[\s\S]*width:\s*100%[\s\S]*height:\s*100%/);
});

test("Logbook download links remain delegated to the existing product CTA component", () => {
  assert.match(logbookPage, /<ProductCtaButtons product="Logbook" context="logbook_hero" \/>/);
  assert.match(logbookPage, /<ProductCtaButtons product="Logbook" context="logbook_final" \/>/);
});
