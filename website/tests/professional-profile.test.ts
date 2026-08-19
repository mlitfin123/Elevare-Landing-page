import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateProfileCompleteness,
  collectCategorySpecialties,
  deriveLegacySpecialties,
  formatCredentialVerificationStatus,
  formatServicePricingSummary,
  hasServiceLevelPricing,
  isValidOptionalUrl,
  normalizeStateValue,
  retainAvailableSpecialties,
} from "../lib/professional-profile.ts";
import { getMarketplaceTaxonomySelections } from "../lib/marketplace-taxonomy.ts";

test("professional locations normalize state names to abbreviations", () => {
  assert.equal(normalizeStateValue("Florida"), "FL");
  assert.equal(normalizeStateValue("fl"), "FL");
});

test("modern marketplace categories preserve a valid legacy specialty", () => {
  assert.deepEqual(
    deriveLegacySpecialties("bodybuilding_physique", ["Competition Prep", "Posing"]),
    { primary: "competition_prep", secondary: [] },
  );
  assert.equal(deriveLegacySpecialties("strength_sports", ["Powerlifting"]).primary, "strength_training");
});

test("profile completeness requires meaningful public profile inputs", () => {
  const incomplete = calculateProfileCompleteness({
    name: "Jane Smith",
    professionalTitle: "Personal Trainer",
    profilePhotoUrl: "",
    bio: "",
    primaryCategory: "personal_training",
    specialties: [],
    serviceModes: ["online"],
    countryCode: "US",
    city: "",
    state: "",
    services: [],
    availability: [],
    acceptanceStatus: "accepting",
  });

  assert.ok(incomplete.percent < 100);
  assert.ok(incomplete.missing.includes("Add a profile photo"));
  assert.ok(incomplete.missing.includes("Add at least one service"));
  assert.equal(incomplete.items.find((item) => item.id === "services")?.section, "offer");
});

test("profile completeness does not require duplicate profile-level pricing", () => {
  const complete = calculateProfileCompleteness({
    name: "Jane Smith",
    professionalTitle: "Personal Trainer",
    profilePhotoUrl: "https://example.com/jane.jpg",
    bio: "I help clients train consistently.",
    primaryCategory: "personal_training",
    specialties: ["General Fitness"],
    serviceModes: ["online"],
    countryCode: "US",
    city: "",
    state: "",
    services: [{ name: "Online coaching" }],
    availability: ["evenings"],
    acceptanceStatus: "accepting",
  });

  assert.equal(complete.percent, 100);
  assert.deepEqual(complete.missing, []);
});

test("in-person profile completeness follows country-specific region rules", () => {
  const base = {
    name: "Jane Smith",
    professionalTitle: "Personal Trainer",
    profilePhotoUrl: "https://example.com/jane.jpg",
    bio: "I help clients train consistently.",
    primaryCategory: "personal_training",
    specialties: ["General Fitness"],
    serviceModes: ["in_person"],
    city: "London",
    services: [{ name: "Personal training" }],
    availability: ["evenings"],
    acceptanceStatus: "accepting",
  };

  const incompleteUsProfile = calculateProfileCompleteness({
    ...base,
    countryCode: "US",
    city: "Miami",
    state: "",
  });
  const completeCanadianProfile = calculateProfileCompleteness({
    ...base,
    countryCode: "CA",
    city: "Toronto",
    state: "ON",
  });
  const completeUkProfile = calculateProfileCompleteness({
    ...base,
    countryCode: "GB",
    state: "",
  });

  assert.ok(incompleteUsProfile.missing.includes("Add your service location or choose online"));
  assert.equal(completeCanadianProfile.percent, 100);
  assert.equal(completeUkProfile.percent, 100);
});

test("specialty options only come from selected marketplace categories", () => {
  const categories = getMarketplaceTaxonomySelections(["bodybuilding_physique", "nutrition"]);
  const available = collectCategorySpecialties(categories);

  assert.ok(available.includes("Competition Prep"));
  assert.ok(available.includes("Sports Nutrition"));
  assert.equal(available.includes("Powerlifting"), false);
  assert.deepEqual(
    retainAvailableSpecialties(["Competition Prep", "Powerlifting"], categories),
    ["Competition Prep"],
  );
});

test("service summaries prioritize service-level price context", () => {
  const pricedService = {
    priceFrom: "75",
    priceTo: "120",
    pricingBasis: "session",
    contactForPricing: false,
  };

  assert.equal(hasServiceLevelPricing([pricedService]), true);
  assert.equal(formatServicePricingSummary(pricedService), "$75-$120/session");
  assert.equal(formatServicePricingSummary({ ...pricedService, currencyCode: "CAD" }), "CA$75-CA$120/session");
  assert.equal(formatServicePricingSummary({ ...pricedService, contactForPricing: true }), "Contact for pricing");
});

test("credential labels are derived from protected backend status and expiration", () => {
  assert.equal(formatCredentialVerificationStatus("verified"), "Verified");
  assert.equal(formatCredentialVerificationStatus("pending_review"), "Pending Verification");
  assert.equal(
    formatCredentialVerificationStatus("verified", "2026-01-01", new Date("2026-08-18T12:00:00Z")),
    "Expired",
  );
});

test("optional public links require web URLs when provided", () => {
  assert.equal(isValidOptionalUrl(""), true);
  assert.equal(isValidOptionalUrl("https://example.com/profile"), true);
  assert.equal(isValidOptionalUrl("instagram.com/example"), false);
});
