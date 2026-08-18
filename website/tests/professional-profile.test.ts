import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateProfileCompleteness,
  deriveLegacySpecialties,
  isValidOptionalUrl,
  normalizeStateValue,
} from "../lib/professional-profile.ts";

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
    city: "",
    state: "",
    services: [],
    hasPricing: false,
    availability: [],
    acceptanceStatus: "accepting",
  });

  assert.ok(incomplete.percent < 100);
  assert.ok(incomplete.missing.includes("Add a profile photo"));
  assert.ok(incomplete.missing.includes("Add at least one service"));
});

test("optional public links require web URLs when provided", () => {
  assert.equal(isValidOptionalUrl(""), true);
  assert.equal(isValidOptionalUrl("https://example.com/profile"), true);
  assert.equal(isValidOptionalUrl("instagram.com/example"), false);
});
