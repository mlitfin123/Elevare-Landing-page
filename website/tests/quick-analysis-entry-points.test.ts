import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  getQuickAnalysisEntryHref,
  normalizeQuickAnalysisSource,
  QUICK_ANALYSIS_SOURCES,
} from "../lib/quick-analysis-attribution.ts";

const projectRoot = process.cwd();
const read = (...segments: string[]) => fs.readFileSync(path.join(projectRoot, ...segments), "utf8");

test("Quick Analysis source attribution accepts only documented non-sensitive identifiers", () => {
  assert.equal(getQuickAnalysisEntryHref("body-fat-calculator"), "/stagelab/quick-analysis/?source=body-fat-calculator");
  assert.equal(normalizeQuickAnalysisSource("prep-files"), "prep-files");
  assert.equal(normalizeQuickAnalysisSource("user@example.com"), undefined);
  assert.equal(normalizeQuickAnalysisSource("body-fat-calculator&result=12"), undefined);
  assert.ok(QUICK_ANALYSIS_SOURCES.includes("homepage"));
  assert.ok(QUICK_ANALYSIS_SOURCES.includes("stagelab"));
});

test("the reusable CTA is contextual, consent-aware, accessible, and centrally priced", () => {
  const component = read("components", "quick-analysis", "QuickAnalysisCTA.tsx");
  const styles = read("app", "globals.css");

  assert.match(component, /quick_analysis_cta_view/);
  assert.match(component, /quick_analysis_cta_clicked/);
  assert.match(component, /eventParams=\{\{ source \}\}/);
  assert.match(component, /formatQuickAnalysisPrice\(\)/);
  assert.match(component, /aria-label="StageLab Quick Analysis"/);
  assert.match(component, /IntersectionObserver/);
  assert.doesNotMatch(component, /body_fat|photo_count|analysis_result|division|optional_context/);
  assert.match(styles, /\.quick-analysis-entry-button[\s\S]*min-height: 46px/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.quick-analysis-entry-cta[\s\S]*grid-template-columns: 1fr/);
});

test("Quick Analysis appears on the approved calculators only after a result", () => {
  const calculators = read("components", "tools", "ToolCalculatorRenderer.tsx");
  const expectedSources = [
    "body-fat-calculator",
    "body-fat-caliper-calculator",
    "contest-prep-countdown",
    "competition-timeline",
    "show-day-checklist",
  ];

  for (const source of expectedSources) {
    assert.equal(calculators.match(new RegExp(`source="${source}"`, "g"))?.length, 1);
  }

  assert.match(calculators, /result \? \([\s\S]*source="body-fat-calculator"/);
  assert.match(calculators, /result \? \([\s\S]*source="contest-prep-countdown"/);
  assert.doesNotMatch(calculators, /source="(?:one-rep-max|macro|calorie|powerlifting|running)/);
});

test("the calculator hub and relevant prep articles receive one focused entry point", () => {
  const directory = read("components", "tools", "CalculatorDirectory.tsx");
  const blogPage = read("app", "blog", "[slug]", "page.tsx");
  const seoAudit = read("scripts", "seo-audit.ts");

  assert.match(directory, /group\.slug === "bodybuilding-contest-prep"/);
  assert.equal(directory.match(/source="calculators-hub"/g)?.length, 1);
  assert.match(blogPage, /post\.category === "prep-files"/);
  assert.match(blogPage, /source="prep-files"/);
  assert.match(blogPage, /post\.category === "prep"/);
  assert.match(blogPage, /source="prep-blog"/);
  assert.doesNotMatch(blogPage, /post\.category === "nutrition"[\s\S]*QuickAnalysisCTA/);
  assert.match(seoAudit, /href\.split\(\/\[\?#\]\//);
});

test("existing Homepage and StageLab placements remain direct, priced, and attributed", () => {
  const homepage = read("app", "page.tsx");
  const stageLab = read("app", "stagelab", "page.tsx");

  assert.match(homepage, /getQuickAnalysisEntryHref\("homepage"\)/);
  assert.match(stageLab, /getQuickAnalysisEntryHref\("stagelab"\)/);
  assert.match(homepage, /QUICK_ANALYSIS_PRICE_DISPLAY/);
  assert.match(stageLab, /QUICK_ANALYSIS_PRICE_DISPLAY/);
  assert.doesNotMatch(`${homepage}\n${stageLab}`, /elevarefit\.org\/stagelab\/quick-analysis/i);
});

test("source attribution reaches the existing funnel without entering analysis data", () => {
  const checkout = read("components", "quick-analysis", "QuickAnalysisCheckout.tsx");
  const checkoutRoute = read("app", "api", "quick-analysis", "checkout", "route.ts");
  const returnRoute = read("app", "stagelab", "quick-analysis", "return", "route.ts");
  const resultExperience = read("components", "quick-analysis", "QuickAnalysisResultExperience.tsx");

  assert.match(checkout, /quick_analysis_view[\s\S]*source/);
  assert.match(checkout, /quick_analysis_checkout_started[\s\S]*source/);
  assert.match(checkoutRoute, /normalizeQuickAnalysisSource/);
  assert.match(checkoutRoute, /success_url:[^\n]*sourceSuffix/);
  assert.match(returnRoute, /purchase=confirmed\$\{sourceSuffix\}/);
  assert.match(resultExperience, /quick_analysis_purchase[\s\S]*source: attributionSource\.current/);
  assert.match(resultExperience, /quick_analysis_completed[\s\S]*source: attributionSource\.current/);
  assert.doesNotMatch(checkoutRoute, /metadata:[\s\S]{0,240}source:/);
});

test("Quick Analysis is not injected into low-intent templates", () => {
  const excludedTemplates = [
    ["app", "exercises", "[slug]", "page.tsx"],
    ["app", "workouts", "[slug]", "page.tsx"],
    ["app", "nutrition", "[restaurantSlug]", "page.tsx"],
    ["app", "professionals", "page.tsx"],
  ];

  for (const segments of excludedTemplates) {
    assert.doesNotMatch(read(...segments), /QuickAnalysisCTA|quick_analysis_cta_/);
  }
});
