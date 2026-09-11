import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { analysisDiscoveryCopy, analysisPaths, articleAnalysisProducts, getCompleteStageSavingsCents, getStageAnalysisEntryHref } from "../lib/stage-analysis-discovery.ts";
import { STAGE_ANALYSIS_PRODUCT_CONFIG, STAGE_ANALYSIS_PRODUCTS, STAGE_ANALYSIS_CURRENCY } from "../lib/stage-analysis.ts";
import { QUICK_ANALYSIS_PRICE_CENTS } from "../lib/quick-analysis.ts";
import { normalizeQuickAnalysisSource } from "../lib/quick-analysis-attribution.ts";
import { resolveQuickAnalysisGenerationLocale } from "../lib/quick-analysis-locale.ts";

test("discovery uses the server-validated prices and a computed same-currency bundle saving", () => {
  assert.equal(STAGE_ANALYSIS_PRODUCT_CONFIG.physique_analysis.priceCents, QUICK_ANALYSIS_PRICE_CENTS);
  assert.equal(STAGE_ANALYSIS_CURRENCY, "usd");
  assert.deepEqual(STAGE_ANALYSIS_PRODUCTS.map((id) => STAGE_ANALYSIS_PRODUCT_CONFIG[id].priceCents), [99, 99, 149]);
  assert.equal(getCompleteStageSavingsCents(), 49);
});

test("all discovery placements preserve product, locale, and allowlisted source through entry URLs", () => {
  for (const [locale, prefix] of [["en", ""], ["es-419", "/es"], ["pt-BR", "/pt-br"]] as const) {
    for (const source of ["home-analyses", "shop-digital", "navigation", "stagelab", "prep-files", "competition-timeline"] as const) {
      assert.equal(normalizeQuickAnalysisSource(source), source);
      for (const product of STAGE_ANALYSIS_PRODUCTS) {
        const href = getStageAnalysisEntryHref(product, source, locale);
        assert.equal(href, `${prefix}${analysisPaths[product]}?source=${source}`);
        assert.ok(analysisDiscoveryCopy[locale].products[product].input);
      }
    }
  }
  assert.equal(normalizeQuickAnalysisSource("person@example.com"), undefined);
  assert.equal(normalizeQuickAnalysisSource("shop-digital&session_id=private"), undefined);
});

test("localized generation stays behind the existing flags with explicit English fallback", () => {
  assert.equal(resolveQuickAnalysisGenerationLocale("es-419", {}), "en");
  assert.equal(resolveQuickAnalysisGenerationLocale("pt-BR", {}), "en");
  assert.equal(resolveQuickAnalysisGenerationLocale("es-419", { ENABLE_QUICK_ANALYSIS_ES_419_GENERATION: "true" }), "es-419");
  assert.equal(resolveQuickAnalysisGenerationLocale("pt-BR", { ENABLE_QUICK_ANALYSIS_PT_BR_GENERATION: "true" }), "pt-BR");
});

test("contextual articles are explicit existing editorial selections, never a keyword fallback", () => {
  assert.equal(articleAnalysisProducts["how-much-protein-do-i-need"], undefined);
  assert.equal(articleAnalysisProducts["mens-physique-classic-physique-prep-4-weeks-out"], "complete_stage_analysis");
  for (const slug of Object.keys(articleAnalysisProducts)) assert.ok(fs.existsSync(`content/blog/${slug}.mdx`));
});

test("homepage has no inventory query or threshold and keeps the requested section sequence", () => {
  const home = fs.readFileSync("components/localization/LocalizedHomePage.tsx", "utf8");
  assert.doesNotMatch(home, /getMarketplace|ProfessionalCard|topCategories|eligibleProfessionalCount|socialProof/);
  const markers = ["home-hero", "home-support", '<StageAnalysisProducts', "home-resources", 'id="apps"', "home-professional-invite", "home-insights"];
  const indices = markers.map((marker) => home.indexOf(marker));
  assert.ok(indices.every((index, i) => index >= 0 && (i === 0 || index > indices[i - 1])));
  const directory = fs.readFileSync("components/marketplace/MarketplaceDirectory.tsx", "utf8");
  assert.doesNotMatch(directory, /exactResults\.length <= 3/);
  assert.match(directory, /target instanceof HTMLDetailsElement/);
});
