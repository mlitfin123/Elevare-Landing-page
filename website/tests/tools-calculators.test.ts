import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBmi,
  calculateBmr,
  calculateBodyRecomposition,
  calculateBodyFatPercentage,
  calculateCalorieDifference,
  calculateCaloriesBurned,
  calculateContestPrepCountdown,
  calculateDots,
  calculateGoalWeightTimeline,
  calculateLeanBodyMass,
  calculateMacroSplit,
  calculateMacroPlan,
  calculateMaintenanceCalories,
  calculateOneRepMax,
  calculateProteinPerMeal,
  calculateProteinRange,
  calculateRepMax,
  calculateRestTime,
  calculateReverseDiet,
  calculateStepsToCalories,
  calculateTargetHeartRate,
  calculateTdee,
  calculateTrainingMax,
  calculateWalkingCalories,
  calculateWilks,
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

test("calculateTdee combines BMR and activity factor", () => {
  const result = calculateTdee({
    sex: "male",
    weightKg: 80,
    heightCm: 180,
    age: 30,
    activityLevel: "moderate",
  });

  assert.deepEqual(result, {
    bmr: 1780,
    activityFactor: 1.55,
    tdee: 2759,
  });
});

test("calculateBmi returns BMI and standard category", () => {
  const result = calculateBmi({
    weight: 180,
    height: 70,
    weightUnit: "lb",
    heightUnit: "in",
  });

  assert.deepEqual(result, {
    bmi: 25.8,
    category: "Overweight",
  });
});

test("calculateLeanBodyMass estimates lean and fat mass", () => {
  const result = calculateLeanBodyMass({
    weight: 200,
    bodyFatPercentage: 20,
    unit: "lb",
  });

  assert.deepEqual(result, {
    leanBodyMassLb: 160,
    leanBodyMassKg: 72.6,
    fatMassLb: 40,
    fatMassKg: 18.1,
  });
});

test("calculateCalorieDifference returns deficit details", () => {
  assert.deepEqual(
    calculateCalorieDifference({
      maintenanceCalories: 2500,
      intakeCalories: 2000,
    }),
    {
      difference: -500,
      weeklyEquivalent: -3500,
      status: "deficit",
    },
  );
});

test("calculateWalkingCalories uses pace-adjusted MET values", () => {
  const result = calculateWalkingCalories({
    bodyweightKg: 81.65,
    durationMinutes: 45,
    speedMph: 3.2,
  });

  assert.deepEqual(result, {
    met: 3.5,
    calories: 225,
    distanceMiles: 2.4,
    caloriesPerMile: 94,
  });
});

test("calculateStepsToCalories estimates stride, distance, and calories", () => {
  const result = calculateStepsToCalories({
    bodyweight: 180,
    unit: "lb",
    steps: 10000,
    height: 70,
    heightUnit: "in",
  });

  assert.deepEqual(result, {
    strideLengthInches: 29.1,
    distanceMiles: 4.58,
    distanceKm: 7.38,
    calories: 437,
  });
});

test("calculateTargetHeartRate returns expected zones", () => {
  const result = calculateTargetHeartRate(30);

  assert.equal(result.maxHeartRate, 190);
  assert.deepEqual(result.zones[0], {
    name: "Very light",
    lowerBpm: 95,
    upperBpm: 114,
  });
  assert.deepEqual(result.zones.at(-1), {
    name: "Maximum",
    lowerBpm: 171,
    upperBpm: 190,
  });
});

test("calculateRepMax compares multiple formulas", () => {
  const result = calculateRepMax(225, 5);

  assert.equal(result.averageEstimate, 258);
  assert.equal(result.lowEstimate, 253);
  assert.equal(result.highEstimate, 264);
  assert.deepEqual(
    result.estimates.map((estimate) => [estimate.formula, estimate.estimate]),
    [
      ["epley", 263],
      ["brzycki", 253],
      ["lombardi", 264],
      ["oconner", 253],
    ],
  );
});

test("calculateTrainingMax defaults to 90 percent of estimated 1RM", () => {
  const result = calculateTrainingMax(225, 5);

  assert.equal(result.estimatedOneRepMax, 263);
  assert.equal(result.trainingMax, 237);
  assert.equal(result.percentages[0]?.trainingWeight, 225);
  assert.equal(result.percentages.at(-1)?.trainingWeight, 166);
});

test("calculateDots and calculateWilks return stable strength scores", () => {
  const dots = calculateDots({
    sex: "male",
    bodyweightKg: 90,
    totalKg: 650,
  });
  const wilks = calculateWilks({
    sex: "male",
    bodyweightKg: 90,
    totalKg: 650,
  });

  assert.equal(dots.bodyweightKg, 90);
  assert.ok(Math.abs(dots.score - 420.29) < 0.01);
  assert.ok(Math.abs(wilks.score - 414.96) < 0.01);
});

test("calculateReverseDiet builds a weekly increase schedule", () => {
  const result = calculateReverseDiet({
    currentCalories: 1900,
    targetCalories: 2500,
    weeklyIncrease: 100,
  });

  assert.equal(result.totalIncrease, 600);
  assert.equal(result.weeks, 6);
  assert.equal(result.milestones[0]?.calories, 2000);
  assert.equal(result.milestones.at(-1)?.calories, 2500);
});

test("calculateBodyRecomposition and calculateProteinPerMeal return practical planning targets", () => {
  const recomp = calculateBodyRecomposition({
    maintenanceCalories: 2500,
    bodyweightLb: 180,
  });
  const protein = calculateProteinPerMeal({
    dailyProtein: 180,
    meals: 4,
  });

  assert.deepEqual(recomp, {
    targetCalories: 2300,
    proteinGrams: 180,
    fatGrams: 64,
    carbGrams: 251,
  });
  assert.deepEqual(protein, {
    perMeal: 45,
    minimumTarget: 40,
    higherTarget: 50,
  });
});

test("calculateMacroSplit and calculateRestTime return readable planning outputs", () => {
  const macros = calculateMacroSplit({
    calories: 2400,
    proteinPercentage: 30,
    carbPercentage: 40,
    fatPercentage: 30,
  });
  const rest = calculateRestTime({
    goal: "hypertrophy",
    exerciseType: "compound",
  });

  assert.deepEqual(macros, {
    proteinCalories: 720,
    carbCalories: 960,
    fatCalories: 720,
    proteinGrams: 180,
    carbGrams: 240,
    fatGrams: 80,
  });
  assert.deepEqual(rest, {
    minimumSeconds: 90,
    maximumSeconds: 180,
    recommendation: "1.5 to 3 minutes",
  });
});
