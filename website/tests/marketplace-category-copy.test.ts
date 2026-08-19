import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMarketplaceCategoryFaqs,
  getMarketplaceTaxonomyCategoryByPublicSlug,
  MARKETPLACE_TAXONOMY_CATEGORIES,
} from "../lib/marketplace-taxonomy.ts";

test("every marketplace category defines human-readable provider nouns", () => {
  for (const category of MARKETPLACE_TAXONOMY_CATEGORIES) {
    assert.ok(category.providerSingular.trim(), `${category.publicSlug} needs a singular provider noun`);
    assert.ok(category.providerPlural.trim(), `${category.publicSlug} needs a plural provider noun`);
    assert.notEqual(category.providerSingular, category.providerPlural, `${category.publicSlug} nouns must differ`);
  }
});

test("category FAQs use provider nouns instead of raw category labels", () => {
  for (const category of MARKETPLACE_TAXONOMY_CATEGORIES) {
    const faqs = buildMarketplaceCategoryFaqs(category.publicSlug);

    assert.equal(
      faqs[0]?.question,
      `What should I look for when hiring a ${category.providerSingular.toLowerCase()}?`,
    );
    assert.equal(
      faqs[1]?.question,
      `Can I browse ${category.providerSingular.toLowerCase()} profiles before creating an account?`,
    );
    assert.equal(
      faqs[2]?.question,
      `Do all ${category.providerPlural.toLowerCase()} work the same way?`,
    );
  }
});

test("personal training, dietetics, and yoga FAQs read naturally", () => {
  const personalTraining = buildMarketplaceCategoryFaqs("personal-training");
  const dietetics = buildMarketplaceCategoryFaqs("dietetics");
  const yoga = buildMarketplaceCategoryFaqs("yoga");

  assert.equal(personalTraining[0]?.question, "What should I look for when hiring a personal trainer?");
  assert.equal(personalTraining[2]?.question, "Do all personal trainers work the same way?");
  assert.equal(dietetics[0]?.question, "What should I look for when hiring a dietitian?");
  assert.equal(dietetics[2]?.question, "Do all dietitians work the same way?");
  assert.equal(yoga[0]?.question, "What should I look for when hiring a yoga instructor?");
  assert.equal(yoga[2]?.question, "Do all yoga instructors work the same way?");

  assert.equal(getMarketplaceTaxonomyCategoryByPublicSlug("dietetics")?.providerSingular, "Dietitian");
});
