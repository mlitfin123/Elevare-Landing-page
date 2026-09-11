import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildProfessionalFallbackGroups,
  findTopCategories,
  formatMarketplaceSocialProofCount,
  getMarketplaceCategorySupply,
  getMarketplaceRotationSeed,
  getMarketplaceResultCountBand,
  selectMarketplaceCategoryCards,
  sortProfessionalsWithRandomizedTies,
  toProfessionalDirectoryRecords,
  type ProfessionalDirectoryFilters,
} from "../lib/marketplace-helpers.ts";
import { marketplaceText } from "../lib/i18n/marketplace-content.ts";
import type {
  ProfessionalCategoryRecord,
  ProfessionalProfileRecord,
} from "../lib/marketplace-types.ts";

const personalTraining: ProfessionalCategoryRecord = {
  id: "personal-training",
  stableId: "personal-training",
  slug: "personal-training",
  publicSlug: "personal-training",
  label: "Personal Training",
  headline: "One-to-one training support",
  shortDescription: "Find personal trainers.",
  sortOrder: 1,
  isActive: true,
};

const nutrition: ProfessionalCategoryRecord = {
  ...personalTraining,
  id: "nutrition-coaching",
  stableId: "nutrition-coaching",
  slug: "nutrition-coaching",
  publicSlug: "nutrition-coaching",
  label: "Nutrition Coaching",
  headline: "Nutrition coaching support",
  shortDescription: "Find nutrition coaches.",
  sortOrder: 2,
};

const yoga: ProfessionalCategoryRecord = {
  ...personalTraining,
  id: "yoga",
  stableId: "yoga",
  slug: "yoga",
  publicSlug: "yoga",
  label: "Yoga",
  headline: "Yoga instruction",
  shortDescription: "Find yoga instructors.",
  sortOrder: 3,
};

function professional(
  index: number,
  overrides: Partial<ProfessionalProfileRecord> = {},
): ProfessionalProfileRecord {
  return {
    id: `private-id-${index}`,
    displayName: `Professional ${index}`,
    profileSlug: `professional-${index}`,
    profilePhotoUrl: null,
    professionalTitle: "Personal Trainer",
    publicHeadline: "Practical training support",
    bestFitSummary: "A good fit for adults building a consistent routine.",
    bio: "A detailed biography that should remain on the profile page only.",
    yearsExperience: 5,
    specialties: ["Strength Training"],
    goalTags: ["general_fitness"],
    experienceLevelsServed: ["beginner"],
    coachingStyle: "Supportive",
    serviceBoundaries: "No medical services.",
    consultationExpectations: "Bring your goals.",
    languages: ["English"],
    countryCode: "US",
    city: "Miami",
    state: "FL",
    postalCode: "33101",
    serviceRadiusMeters: 16000,
    serviceArea: "Miami",
    remoteAvailable: true,
    serviceModes: ["in_person", "online"],
    priceFrom: 75,
    priceTo: null,
    pricingCurrency: "USD",
    pricingBasis: "session",
    contactForPricing: false,
    availabilitySummary: "Weekday evenings",
    typicalAvailability: ["weekday_evenings"],
    availabilityDetails: "Contact for current openings.",
    availabilityConfirmedAt: "2026-09-01T12:00:00.000Z",
    clientAcceptanceStatus: "accepting",
    websiteUrl: "https://example.com",
    socialLinks: { instagram: "https://instagram.com/example" },
    approvalStatus: "approved",
    isActive: true,
    isPublic: true,
    identityVerificationStatus: "verified",
    trustSummary: {
      profileReviewed: true,
      profileReviewedAt: "2026-08-01T12:00:00.000Z",
      emailVerified: true,
      phoneVerified: false,
      identityVerified: true,
      identityVerifiedAt: "2026-08-01T12:00:00.000Z",
      backgroundCheckCompleted: false,
      backgroundCheckCompletedAt: null,
      backgroundCheckProduct: null,
      insuranceConfirmed: false,
      insuranceConfirmedThrough: null,
      profileInformationConfirmedAt: "2026-09-01T12:00:00.000Z",
      accountInGoodStanding: true,
    },
    reviewFeedbackPublic: "Internal workflow feedback",
    lastSubmittedAt: "2026-08-01T12:00:00.000Z",
    categories: [personalTraining],
    credentials: [],
    services: [],
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-09-01T12:00:00.000Z",
    ...overrides,
  };
}

const unfiltered: ProfessionalDirectoryFilters = {
  category: "all",
  location: "all",
  serviceMode: "all",
  specialty: "all",
  query: "",
};

test("result bands cover zero, one, two, three, and larger inventories without exact analytics counts", () => {
  assert.equal(getMarketplaceResultCountBand(0), "zero");
  assert.equal(getMarketplaceResultCountBand(1), "one");
  assert.equal(getMarketplaceResultCountBand(2), "two_to_three");
  assert.equal(getMarketplaceResultCountBand(3), "two_to_three");
  assert.equal(getMarketplaceResultCountBand(8), "four_to_ten");
  assert.equal(getMarketplaceResultCountBand(11), "more_than_ten");
});

test("directory records include only eligible profiles and remove profile-only fields", () => {
  const records = toProfessionalDirectoryRecords([
    professional(1),
    professional(2, { approvalStatus: "pending_review" }),
    professional(3, { isActive: false }),
    professional(4, { isPublic: false }),
  ]);

  assert.equal(records.length, 1);
  assert.ok((records[0]?.directoryCompletenessScore ?? 0) > 0);
  assert.equal(records[0]?.bio, "");
  assert.equal(records[0]?.id, records[0]?.profileSlug);
  assert.equal(records[0]?.postalCode, null);
  assert.equal(records[0]?.serviceRadiusMeters, null);
  assert.equal(records[0]?.serviceBoundaries, null);
  assert.equal(records[0]?.consultationExpectations, null);
  assert.equal(records[0]?.websiteUrl, null);
  assert.deepEqual(records[0]?.socialLinks, {});
  assert.deepEqual(records[0]?.credentials, []);
  assert.deepEqual(records[0]?.services, []);
  assert.equal(records[0]?.reviewFeedbackPublic, null);
});

test("zero, one, two, three, and larger eligible fixtures preserve intentional result density", () => {
  for (const count of [0, 1, 2, 3, 12]) {
    const records = toProfessionalDirectoryRecords(
      Array.from({ length: count }, (_, index) => professional(index + 1)),
    );
    const visible = sortProfessionalsWithRandomizedTies(records, {}, "density").slice(0, 6);

    assert.equal(records.length, count);
    assert.equal(visible.length, Math.min(count, 6));
    assert.equal(new Set(visible.map((entry) => entry.profileSlug)).size, visible.length);
  }
});

test("accepting professionals rank first and tied ordering is stable for a given seed", () => {
  const accepting = professional(1, {
    professionalTitle: "",
    publicHeadline: null,
    bestFitSummary: null,
    bio: "",
    specialties: [],
    goalTags: [],
    experienceLevelsServed: [],
    coachingStyle: null,
    profilePhotoUrl: null,
    priceFrom: null,
    availabilitySummary: null,
    trustSummary: undefined,
  });
  const unavailable = professional(2, { clientAcceptanceStatus: "not_accepting" });
  const tied = Array.from({ length: 8 }, (_, index) => professional(index + 10));

  assert.equal(sortProfessionalsWithRandomizedTies([unavailable, accepting], {}, "ranking")[0]?.id, accepting.id);
  assert.deepEqual(
    sortProfessionalsWithRandomizedTies(tied, {}, "stable").map((entry) => entry.profileSlug),
    sortProfessionalsWithRandomizedTies(tied, {}, "stable").map((entry) => entry.profileSlug),
  );
  assert.notDeepEqual(
    sortProfessionalsWithRandomizedTies(tied, {}, "stable").map((entry) => entry.profileSlug),
    sortProfessionalsWithRandomizedTies(tied, {}, "another-stable-seed").map((entry) => entry.profileSlug),
  );
  assert.equal(
    getMarketplaceRotationSeed("directory", new Date("2026-09-10T23:59:59.000Z")),
    "directory:2026-09-10",
  );
});

test("category cards favor real accepting supply and keep empty categories out of primary discovery", () => {
  const professionals = [
    professional(1, { categories: [nutrition], clientAcceptanceStatus: "waitlist" }),
    professional(2, { categories: [personalTraining], clientAcceptanceStatus: "accepting" }),
    professional(3, { categories: [personalTraining], clientAcceptanceStatus: "not_accepting" }),
  ];
  const categories = [yoga, nutrition, personalTraining];
  const supply = getMarketplaceCategorySupply(categories, professionals);

  assert.deepEqual(
    selectMarketplaceCategoryCards(categories, professionals).map((entry) => entry.slug),
    ["personal-training", "nutrition-coaching"],
  );
  assert.deepEqual(findTopCategories(categories, professionals).map((entry) => entry.slug), ["personal-training", "nutrition-coaching"]);
  assert.equal(supply.find((entry) => entry.category.slug === "yoga")?.listedCount, 0);
});

test("explicit local or in-person searches never silently fall back to online profiles", () => {
  const remote = professional(1, {
    city: "Maceio",
    state: "Alagoas",
    countryCode: "BR",
    serviceModes: ["online"],
    remoteAvailable: true,
  });

  const localFilters = { ...unfiltered, category: "personal-training", location: "Miami, FL" };
  const inPersonFilters = { ...unfiltered, category: "personal-training", serviceMode: "in_person" };

  assert.deepEqual(buildProfessionalFallbackGroups({ professionals: [remote], filters: localFilters, exactResults: [] }), []);
  assert.deepEqual(buildProfessionalFallbackGroups({ professionals: [remote], filters: inPersonFilters, exactResults: [] }), []);
});

test("marketplace-wide social proof remains hidden below the established 500-profile threshold", () => {
  assert.equal(formatMarketplaceSocialProofCount(0), null);
  assert.equal(formatMarketplaceSocialProofCount(499), null);
  assert.equal(formatMarketplaceSocialProofCount(500), "500+ profiles");
});

test("low-inventory directory UI is initial, progressive, deterministic, accessible, and reuses guided matching", () => {
  const source = readFileSync(
    new URL("../components/marketplace/MarketplaceDirectory.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /Math\.random|hasStartedSearch/);
  assert.match(source, /INITIAL_VISIBLE_PROFILE_COUNT = 6/);
  assert.match(source, /PROFILE_BATCH_SIZE = 6/);
  assert.match(source, /exactResults\.slice\(0, visibleProfileCount\)/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /tabIndex=\{-1\}/);
  assert.match(source, /MarketplaceDemandForm/);
  assert.match(source, /id="guided-matching"/);
  assert.match(source, /More types of support/);
  assert.match(source, /result_count_band/);
  assert.doesNotMatch(source, /professional_id:\s*professional\.id|exact_location|raw_query/);
});

test("new low-inventory copy has Spanish and Brazilian Portuguese parity", () => {
  for (const message of [
    "Find Trainers, Coaches & Wellness Experts | Elevare",
    "Explore personal trainers, nutrition coaches, bodybuilding coaches, wellness specialists, and other fitness and health-focused services on Elevare.",
    "Discover trainers, coaches, nutrition professionals, and wellness specialists based on your goals, location, and preferences.",
    "Professionals accepting clients",
    "More types of support",
    "Want help finding the right professional?",
    "Browse all available professionals",
    "Include online professionals",
    "Elevare is building its professional network",
  ]) {
    assert.notEqual(marketplaceText("es-419", message), message);
    assert.notEqual(marketplaceText("pt-BR", message), message);
  }
});

test("localized homepage keeps marketplace navigation on localized routes", () => {
  const source = readFileSync(
    new URL("../components/localization/LocalizedHomePage.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /localizePathname\(path, locale\)/);
  assert.match(source, /href=\{href\("\/professionals\/"\)\}/);
  assert.doesNotMatch(source, /getMarketplaceProfessionals|category\.slug|ProfessionalCard/);
  assert.match(source, /guided_matching_selected/);
  assert.match(source, /href\("\/professionals\/#guided-matching"\)/);
});
