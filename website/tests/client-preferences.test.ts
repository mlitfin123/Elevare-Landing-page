import assert from "node:assert/strict";
import test from "node:test";
import {
  CLIENT_CATEGORY_DESCRIPTIONS,
  CLIENT_GOAL_ALIASES,
  CLIENT_GOAL_OPTIONS,
  getBudgetCents,
  normalizeClientBudgetRange,
  normalizeClientGoalTags,
  normalizeClientTimeline,
  shouldShowClientRadius,
  toClientServiceMode,
  toDatabaseServiceMode,
} from "../lib/client-preferences.ts";
import { MARKETPLACE_TAXONOMY_CATEGORIES } from "../lib/marketplace-taxonomy.ts";

test("client service mode uses consumer-facing Either without changing the database enum", () => {
  assert.equal(toClientServiceMode("both"), "either");
  assert.equal(toDatabaseServiceMode("either"), "both");
  assert.equal(toDatabaseServiceMode("online"), "online");
});

test("structured goals preserve new values and safely map legacy fitness goals", () => {
  assert.deepEqual(normalizeClientGoalTags(["Improve Nutrition", "Build Muscle"], ["fat_loss"]), [
    "Improve Nutrition",
    "Build Muscle",
  ]);
  assert.deepEqual(normalizeClientGoalTags([], ["fat_loss", "competition_prep"]), [
    "Weight Loss / Fat Loss",
    "Prepare for a Competition",
  ]);
  assert.deepEqual(
    normalizeClientGoalTags(
      ["Lose Weight", "Lose Body Fat", "Improve General Fitness", "Improve Conditioning"],
      [],
    ),
    ["Weight Loss / Fat Loss", "Improve Fitness & Conditioning"],
  );
  assert.equal(CLIENT_GOAL_OPTIONS.length, 20);
  assert.ok(CLIENT_GOAL_OPTIONS.includes("Other"));
});

test("every retired goal label maps to a visible consolidated option", () => {
  for (const canonicalGoal of Object.values(CLIENT_GOAL_ALIASES)) {
    assert.ok(CLIENT_GOAL_OPTIONS.includes(canonicalGoal));
  }
});

test("travel radius is only relevant to service modes with an in-person option", () => {
  assert.equal(shouldShowClientRadius("in_person"), true);
  assert.equal(shouldShowClientRadius("either"), true);
  assert.equal(shouldShowClientRadius("online"), false);
  assert.equal(shouldShowClientRadius(""), false);
});

test("budget selections generate matching legacy cent values", () => {
  assert.deepEqual(getBudgetCents("100_200"), {
    budgetMinCents: 10000,
    budgetMaxCents: 20000,
  });
  assert.deepEqual(getBudgetCents("flexible"), {
    budgetMinCents: null,
    budgetMaxCents: null,
  });
  assert.equal(normalizeClientBudgetRange("90_120"), "100_200");
});

test("legacy timelines remain readable in the new preference flow", () => {
  assert.equal(normalizeClientTimeline("this_week"), "asap");
  assert.equal(normalizeClientTimeline("within_two_weeks"), "within_few_weeks");
});

test("every marketplace category has concise client-facing copy", () => {
  for (const category of MARKETPLACE_TAXONOMY_CATEGORIES) {
    assert.ok(CLIENT_CATEGORY_DESCRIPTIONS[category.stableId]);
    assert.ok(CLIENT_CATEGORY_DESCRIPTIONS[category.stableId].length < 70);
  }
});
