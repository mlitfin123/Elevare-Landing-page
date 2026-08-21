import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExerciseFaqs,
  buildExerciseSummary,
  buildWorkoutSummary,
  getExerciseSpecificBenefits,
  getExerciseSpecificMistakes,
  getRelatedWorkoutTemplates,
  getRelatedWorkoutTemplatesForExercise,
  type ExerciseRecord,
  type WorkoutTemplateExerciseRecord,
  type WorkoutTemplateRecord,
} from "../lib/training-data.ts";
import { tools } from "../lib/tools.ts";

function makeExercise(overrides: Partial<ExerciseRecord> = {}): ExerciseRecord {
  return {
    id: "exercise-1",
    name: "Dumbbell Bench Press",
    slug: "dumbbell-bench-press",
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: ["shoulders", "arms"],
    equipment: ["dumbbell"],
    movementPattern: "horizontal-push",
    difficulty: "beginner",
    exerciseType: "strength",
    isCompound: true,
    instructions: [],
    commonMistakes: [],
    benefits: [],
    alternatives: [],
    variations: [],
    seoTitle: null,
    seoDescription: null,
    source: null,
    sourceLicense: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function makeWorkout(overrides: Partial<WorkoutTemplateRecord> = {}): WorkoutTemplateRecord {
  return {
    id: "workout-1",
    name: "Four-Day Upper Lower Split",
    slug: "four-day-upper-lower-split",
    goal: "muscle-gain",
    difficulty: "intermediate",
    estimatedDurationMinutes: 55,
    equipment: ["barbell", "dumbbell"],
    overview: null,
    whoItIsFor: null,
    warmupGuidance: null,
    progressionGuidance: null,
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 4,
    targetMuscleGroups: ["chest", "back", "legs", "shoulders", "arms"],
    seoTitle: null,
    seoDescription: null,
    isPublic: true,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

test("exercise summaries use natural grammar and structured exercise data", () => {
  const beginner = buildExerciseSummary(makeExercise());
  const intermediate = buildExerciseSummary(makeExercise({
    name: "Romanian Deadlift",
    slug: "romanian-deadlift",
    primaryMuscleGroup: "legs",
    secondaryMuscleGroups: ["glutes", "back"],
    equipment: ["barbell"],
    difficulty: "intermediate",
  }));

  assert.equal(
    beginner,
    "Dumbbell Bench Press is a beginner-friendly chest exercise performed with dumbbells. It also involves the shoulders and arms.",
  );
  assert.equal(
    intermediate,
    "Romanian Deadlift is an intermediate-level leg exercise performed with a barbell. It also involves the glutes and back.",
  );
  assert.doesNotMatch(`${beginner} ${intermediate}`, /a beginner strength|\b(?:undefined|null)\b/i);
});

test("exercise presentation removes generated filler but keeps source-specific notes", () => {
  const exercise = makeExercise({
    benefits: [
      "Builds strength and control through the chest region.",
      "Allows each arm to press independently.",
      "Gives you a repeatable way to track progress inside Logbook over time.",
    ],
    commonMistakes: [
      "Using more weight or speed than you can control cleanly.",
      "Letting the elbows drift directly out from the shoulders.",
    ],
  });

  assert.deepEqual(getExerciseSpecificBenefits(exercise), ["Allows each arm to press independently."]);
  assert.deepEqual(getExerciseSpecificMistakes(exercise), [
    "Letting the elbows drift directly out from the shoulders.",
  ]);
});

test("exercise FAQs are concise, supported by data, and use readable equipment names", () => {
  const faqs = buildExerciseFaqs(makeExercise());
  const faqText = JSON.stringify(faqs);

  assert.equal(faqs.length, 3);
  assert.match(faqText, /primarily trains the chest/);
  assert.match(faqText, /uses dumbbells/);
  assert.doesNotMatch(faqText, /\b(?:undefined|null)\b/i);
});

test("workout summaries state schedule, level, focus, duration, and equipment", () => {
  const summary = buildWorkoutSummary(makeWorkout());
  const scheduleUnknown = buildWorkoutSummary(makeWorkout({
    name: "Advanced Strength Session",
    slug: "advanced-strength-session",
    difficulty: "advanced",
    trainingDaysPerWeek: null,
  }));

  assert.equal(
    summary,
    "Four-Day Upper Lower Split is a 4-day intermediate workout for muscle gain. Sessions take about 55 minutes. The main equipment is a barbell and dumbbells.",
  );
  assert.match(scheduleUnknown, /^Advanced Strength Session is an advanced workout/);
  assert.doesNotMatch(summary, /support your goals|designed to help|\b(?:undefined|null)\b/i);
});

test("related workouts exclude the current workout and duplicate canonical slugs", () => {
  const current = makeWorkout();
  const duplicateAlias = makeWorkout({ id: "workout-alias", slug: "four-day-upper-lower-split-a1b2c3d4" });
  const related = makeWorkout({ id: "workout-2", name: "Upper Lower Hypertrophy", slug: "upper-lower-hypertrophy" });
  const unrelated = makeWorkout({
    id: "workout-3",
    name: "Beginner Walking Plan",
    slug: "beginner-walking-plan",
    goal: "weight-loss",
    difficulty: "beginner",
    equipment: ["bodyweight"],
    targetMuscleGroups: ["legs"],
  });

  const results = getRelatedWorkoutTemplates(current, [current, duplicateAlias, related, unrelated], 6);

  assert.deepEqual(results.map((workout) => workout.slug), ["upper-lower-hypertrophy"]);
});

test("exercise-related workouts are relevant and deduplicated by canonical slug", () => {
  const exercise = makeExercise();
  const primary = makeWorkout({ id: "workout-2", name: "Chest Strength", slug: "chest-strength" });
  const alias = makeWorkout({ id: "workout-3", name: "Chest Strength", slug: "chest-strength-a1b2c3d4" });
  const equipmentOnly = makeWorkout({
    id: "workout-4",
    name: "Dumbbell Legs",
    slug: "dumbbell-legs",
    goal: "strength",
    difficulty: "advanced",
    targetMuscleGroups: ["legs"],
    equipment: ["dumbbell"],
  });
  const rows: WorkoutTemplateExerciseRecord[] = [{
    id: "row-1",
    workoutTemplateId: primary.id,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    dayLabel: "Day 1",
    section: "Main",
    sortOrder: 1,
    sets: "3",
    reps: "8",
    restSeconds: 120,
    notes: null,
    createdAt: null,
  }];

  const results = getRelatedWorkoutTemplatesForExercise(exercise, [primary, alias, equipmentOnly], rows, 6);

  assert.deepEqual(results.map((workout) => workout.slug), ["chest-strength"]);
});

test("calculator copy uses calculator-specific inputs, limits, and next steps", () => {
  for (const tool of tools) {
    assert.equal(tool.faqs.length, 4);
    assert.doesNotMatch(
      JSON.stringify({ explanation: tool.explanation, faqs: tool.faqs }),
      /fresh checkpoint|one small adjustment at a time|Use that result as an estimate/,
    );
  }
});
