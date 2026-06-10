import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBmr,
  calculateBodyFatPercentage,
  calculateCaloriesBurned,
  calculateContestPrepCountdown,
  calculateGoalWeightTimeline,
  calculateMacroPlan,
  calculateMaintenanceCalories,
  calculateOneRepMax,
  calculateProteinRange,
  generateCompetitionTimeline,
  generateShowDayChecklist,
} from "../lib/tool-calculators.ts";

test("calculateBmr and maintenance calories follow Mifflin-St Jeor", () => {
  const bmr = calculateBmr({
    sex: "male",
    weightKg: 80,
    heightCm: 180,
    age: 30,
  });

  assert.equal(bmr, 1780);
  assert.equal(Math.round(calculateMaintenanceCalories(bmr, "moderate")), 2759);
});

test("calculateProteinRange returns the correct range for fat loss", () => {
  assert.deepEqual(calculateProteinRange(180, "fatLoss"), {
    minimum: 144,
    maximum: 198,
  });
});

test("calculateMacroPlan returns high, moderate, and low-carb options", () => {
  const plan = calculateMacroPlan({
    calories: 2400,
    bodyweightLb: 180,
    goal: "fatLoss",
  });

  assert.equal(plan.proteinGrams, 171);
  assert.deepEqual(
    plan.plans.map((option) => ({
      label: option.label,
      fatGrams: option.fatGrams,
      carbGrams: option.carbGrams,
      valid: option.valid,
    })),
    [
      { label: "High carb", fatGrams: 53, carbGrams: 310, valid: true },
      { label: "Moderate carb", fatGrams: 67, carbGrams: 278, valid: true },
      { label: "Low carb", fatGrams: 80, carbGrams: 249, valid: true },
    ],
  );
});

test("calculateGoalWeightTimeline estimates weeks and target date", () => {
  const result = calculateGoalWeightTimeline({
    currentWeightLb: 200,
    goalWeightLb: 180,
    weeklyRateLb: 1,
    currentDate: new Date("2026-06-10T00:00:00"),
  });

  assert.equal(result.direction, "loss");
  assert.equal(result.totalWeeks, 20);
  assert.equal(result.targetDate.toISOString().slice(0, 10), "2026-10-28");
  assert.equal(result.aggressiveLoss, false);
});

test("calculateBodyFatPercentage estimates navy body fat for a male", () => {
  const result = calculateBodyFatPercentage({
    sex: "male",
    height: 70,
    neck: 15,
    waist: 34,
    unit: "in",
  });

  assert.equal(result.percentage, 17.5);
  assert.equal(result.category, "Fitness");
});

test("calculateOneRepMax uses the Epley formula", () => {
  const result = calculateOneRepMax(225, 5);

  assert.equal(result.oneRepMax, 263);
  assert.equal(result.trainingPercentages[0]?.trainingWeight, 249);
  assert.equal(result.trainingPercentages.at(-1)?.trainingWeight, 158);
});

test("calculateCaloriesBurned uses the MET formula", () => {
  const result = calculateCaloriesBurned({
    activity: "walking",
    bodyweightKg: 81.65,
    durationMinutes: 45,
  });

  assert.equal(result.calories, 244);
  assert.equal(result.caloriesPerHour, 326);
});

test("calculateContestPrepCountdown returns days, weeks, and phase", () => {
  const result = calculateContestPrepCountdown({
    showDate: new Date("2026-07-15T00:00:00"),
    currentDate: new Date("2026-06-10T00:00:00"),
  });

  assert.equal(result.daysOut, 35);
  assert.equal(result.weeksOut, 5);
  assert.equal(result.phase, "Final fat loss phase");
});

test("generateCompetitionTimeline returns core contest milestones", () => {
  const timeline = generateCompetitionTimeline({
    showDate: new Date("2026-09-12T00:00:00"),
    experienceLevel: "beginner",
    division: "Men's Physique",
  });

  assert.equal(timeline.length, 9);
  assert.equal(timeline[0]?.title, "Choose show");
  assert.equal(timeline[1]?.title, "Start prep");
  assert.equal(timeline.at(-1)?.title, "Show day");
});

test("generateShowDayChecklist returns grouped checklist items", () => {
  const checklist = generateShowDayChecklist({
    division: "Men's Physique",
    travelRequired: true,
  });

  assert.ok(checklist.Documents.includes("Photo ID"));
  assert.ok(checklist.Clothing.includes("Board shorts"));
  assert.ok(checklist["Travel items"].includes("Hotel confirmation"));
});
