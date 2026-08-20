import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMarketplaceCategoryMetaDescription,
  buildMarketplaceProfessionalMetaDescription,
  buildMarketplaceProfessionalSeoTitle,
  getIndexableMarketplaceProfessionals,
  getMarketplaceCategoryProfessionalCount,
  isMarketplaceCategoryIndexable,
  isMarketplaceFilteredSearch,
  isPublicMarketplaceProfessional,
  isSeoLocationPageEligible,
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
    contactForPricing: false,
    availabilitySummary: null,
    typicalAvailability: [],
    availabilityDetails: null,
    clientAcceptanceStatus: "accepting",
    websiteUrl: null,
    socialLinks: {},
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
    countryCode: overrides.countryCode ?? "US",
    postalCode: overrides.postalCode ?? null,
    serviceRadiusMeters: overrides.serviceRadiusMeters ?? null,
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

test("future location pages require an explicit inventory policy and unique content", () => {
  const professionals = [
    createProfessional({ id: "one" }),
    createProfessional({ id: "two", profileSlug: "sam-lee" }),
    createProfessional({ id: "three", profileSlug: "jordan-cole" }),
  ];

  assert.equal(
    isSeoLocationPageEligible({
      category,
      professionals,
      countryCode: "US",
      city: "Miami",
      region: "Florida",
      hasUniqueContent: true,
      hasMeaningfulSearchIntent: true,
      inventoryMeetsRequirement: (count) => count >= 3,
    }),
    true,
  );
  assert.equal(
    isSeoLocationPageEligible({
      category,
      professionals,
      countryCode: "US",
      city: "Miami",
      hasUniqueContent: false,
      hasMeaningfulSearchIntent: true,
      inventoryMeetsRequirement: (count) => count >= 1,
    }),
    false,
  );
  assert.equal(
    isSeoLocationPageEligible({
      category,
      professionals,
      countryCode: "US",
      city: "Miami",
      hasUniqueContent: true,
      hasMeaningfulSearchIntent: true,
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

test("profile titles use natural local locations and avoid U.S.-only assumptions", () => {
  const localMode = { remoteAvailable: false, serviceModes: ["in_person"] };

  assert.equal(
    buildMarketplaceProfessionalSeoTitle(createProfessional({
      ...localMode,
      displayName: "John Smith",
      professionalTitle: "Personal Trainer",
      city: "Miami",
      state: "Florida",
      countryCode: "US",
    })),
    "John Smith \u2014 Personal Trainer in Miami, FL | Elevare",
  );
  assert.equal(
    buildMarketplaceProfessionalSeoTitle(createProfessional({
      ...localMode,
      displayName: "Sarah Jones",
      professionalTitle: "Nutrition Coach",
      city: "Toronto",
      state: "ON",
      countryCode: "CA",
      pricingCurrency: "CAD",
    })),
    "Sarah Jones \u2014 Nutrition Coach in Toronto, Ontario | Elevare",
  );
  assert.equal(
    buildMarketplaceProfessionalSeoTitle(createProfessional({
      ...localMode,
      displayName: "Alex Brown",
      professionalTitle: "Life Coach",
      city: "London",
      state: null,
      countryCode: "GB",
      pricingCurrency: "GBP",
    })),
    "Alex Brown \u2014 Life Coach in London | Elevare",
  );
});

test("online-only profile metadata does not force a home city", () => {
  const professional = createProfessional({
    displayName: "Jane Smith",
    professionalTitle: "Competition Prep Coach",
    city: "Miami",
    state: "FL",
    countryCode: "US",
    remoteAvailable: true,
    serviceModes: ["online"],
  });

  assert.equal(
    buildMarketplaceProfessionalSeoTitle(professional),
    "Jane Smith \u2014 Online Competition Prep Coach | Elevare",
  );
  assert.doesNotMatch(buildMarketplaceProfessionalMetaDescription(professional), /Miami/);
  assert.match(buildMarketplaceProfessionalMetaDescription(professional), /online competition prep coach/i);
});

test("sitemap profile selection is country agnostic and approval aware", () => {
  const professionals = [
    createProfessional({ id: "us", countryCode: "US" }),
    createProfessional({ id: "ca", profileSlug: "ca-profile", countryCode: "CA" }),
    createProfessional({ id: "gb", profileSlug: "gb-profile", countryCode: "GB" }),
    createProfessional({ id: "au", profileSlug: "au-profile", countryCode: "AU" }),
    createProfessional({ id: "pending", profileSlug: "pending", countryCode: "CA", approvalStatus: "pending_review" }),
  ];

  assert.deepEqual(
    getIndexableMarketplaceProfessionals(professionals).map((professional) => professional.id),
    ["us", "ca", "gb", "au"],
  );
});

test("filtered marketplace queries remain non-canonical search views", () => {
  assert.equal(isMarketplaceFilteredSearch(""), false);
  assert.equal(isMarketplaceFilteredSearch("country=CA"), true);
  assert.equal(isMarketplaceFilteredSearch("country=CA&city=Toronto&category=nutrition"), true);
});
