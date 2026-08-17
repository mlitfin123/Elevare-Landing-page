import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMarketplaceCategoryMetaDescription,
  buildMarketplaceProfessionalMetaDescription,
  getMarketplaceCategoryProfessionalCount,
  isMarketplaceCategoryIndexable,
  isMarketplaceLocationCategoryIndexable,
  isPublicMarketplaceProfessional,
} from "../lib/marketplace-seo.ts";
import type {
  ProfessionalCategoryRecord,
  ProfessionalProfileRecord,
} from "../lib/marketplace-types.ts";

const category: ProfessionalCategoryRecord = {
  id: "nutrition",
  stableId: "nutrition",
  slug: "nutrition",
  publicSlug: "nutrition",
  label: "Nutrition",
  headline: "Nutrition support",
  shortDescription: "Find nutrition professionals.",
  sortOrder: 1,
  isActive: true,
};

function createProfessional(
  overrides: Partial<ProfessionalProfileRecord> = {},
): ProfessionalProfileRecord {
  return {
    id: "professional-1",
    userId: "user-1",
    displayName: "Alex Morgan",
    profileSlug: "alex-morgan",
    profilePhotoUrl: null,
    professionalTitle: "Nutrition Coach",
    bio: "Practical nutrition support for active adults.",
    yearsExperience: 5,
    specialties: ["Sports nutrition"],
    city: "Miami",
    state: "FL",
    serviceArea: null,
    remoteAvailable: true,
    serviceModes: ["online"],
    priceFrom: null,
    priceTo: null,
    pricingCurrency: "USD",
    pricingBasis: null,
    availabilitySummary: null,
    approvalStatus: "approved",
    isActive: true,
    isPublic: true,
    identityVerificationStatus: "verified",
    reviewFeedbackPublic: null,
    lastSubmittedAt: null,
    categories: [category],
    credentials: [],
    services: [],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

test("public marketplace eligibility requires approved, active, and public", () => {
  assert.equal(isPublicMarketplaceProfessional(createProfessional()), true);
  assert.equal(
    isPublicMarketplaceProfessional(createProfessional({ approvalStatus: "pending_review" })),
    false,
  );
  assert.equal(isPublicMarketplaceProfessional(createProfessional({ isActive: false })), false);
  assert.equal(isPublicMarketplaceProfessional(createProfessional({ isPublic: false })), false);
});

test("category inventory only counts eligible public professionals", () => {
  const professionals = [
    createProfessional(),
    createProfessional({ id: "pending", approvalStatus: "pending_review" }),
    createProfessional({ id: "private", isPublic: false }),
  ];

  assert.equal(getMarketplaceCategoryProfessionalCount(category, professionals), 1);
  assert.equal(isMarketplaceCategoryIndexable(category, professionals), true);
  assert.equal(isMarketplaceCategoryIndexable(category, professionals.slice(1)), false);
});

test("future location pages require enough eligible inventory", () => {
  const professionals = [
    createProfessional({ id: "one" }),
    createProfessional({ id: "two", profileSlug: "sam-lee" }),
    createProfessional({ id: "three", profileSlug: "jordan-cole" }),
  ];

  assert.equal(
    isMarketplaceLocationCategoryIndexable({ category, professionals, city: "Miami" }),
    true,
  );
  assert.equal(
    isMarketplaceLocationCategoryIndexable({
      category,
      professionals: professionals.slice(0, 2),
      city: "Miami",
    }),
    false,
  );
});

test("marketplace metadata is descriptive and bounded", () => {
  const categoryDescription = buildMarketplaceCategoryMetaDescription(category);
  const professionalDescription = buildMarketplaceProfessionalMetaDescription(createProfessional());

  assert.match(categoryDescription, /nutrition/i);
  assert.ok(categoryDescription.length <= 160);
  assert.match(professionalDescription, /Alex Morgan/);
  assert.ok(professionalDescription.length <= 160);
});
