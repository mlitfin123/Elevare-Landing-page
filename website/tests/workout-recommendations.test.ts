import assert from "node:assert/strict";
import test from "node:test";
import { recommendWorkoutTemplates } from "../lib/workout-recommendations.ts";
import type { WorkoutTemplateRecord } from "../lib/training-data.ts";

const templates: WorkoutTemplateRecord[] = [
  {
    id: "wt-1",
    name: "Beginner Weight Loss Workout",
    slug: "beginner-weight-loss-workout",
    goal: "weight-loss",
    difficulty: "beginner",
    estimatedDurationMinutes: 40,
    equipment: ["bodyweight", "dumbbell"],
    overview: null,
    whoItIsFor: null,
    warmupGuidance: null,
    progressionGuidance: null,
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders", "core"],
    seoTitle: null,
    seoDescription: null,
    isPublic: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "wt-2",
    name: "30-Minute Fat Loss Workout",
    slug: "30-minute-fat-loss-workout",
    goal: "weight-loss",
    difficulty: "beginner",
    estimatedDurationMinutes: 30,
    equipment: ["dumbbell", "bodyweight"],
    overview: null,
    whoItIsFor: null,
    warmupGuidance: null,
    progressionGuidance: null,
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "core"],
    seoTitle: null,
    seoDescription: null,
    isPublic: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "wt-3",
    name: "4-Day Upper Lower Split",
    slug: "4-day-upper-lower-split",
    goal: "muscle-building",
    difficulty: "intermediate",
    estimatedDurationMinutes: 60,
    equipment: ["barbell", "dumbbell", "cable", "machine"],
    overview: null,
    whoItIsFor: null,
    warmupGuidance: null,
    progressionGuidance: null,
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 4,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders", "arms"],
    seoTitle: null,
    seoDescription: null,
    isPublic: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "wt-4",
    name: "Upper Body Workout",
    slug: "upper-body-workout",
    goal: "muscle-building",
    difficulty: "intermediate",
    estimatedDurationMinutes: 60,
    equipment: ["barbell", "dumbbell", "cable"],
    overview: null,
    whoItIsFor: null,
    warmupGuidance: null,
    progressionGuidance: null,
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 4,
    targetMuscleGroups: ["chest", "back", "shoulders", "arms"],
    seoTitle: null,
    seoDescription: null,
    isPublic: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "wt-5",
    name: "Beginner Strength Program",
    slug: "beginner-strength-program",
    goal: "strength",
    difficulty: "beginner",
    estimatedDurationMinutes: 60,
    equipment: ["barbell", "bodyweight"],
    overview: null,
    whoItIsFor: null,
    warmupGuidance: null,
    progressionGuidance: null,
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders"],
    seoTitle: null,
    seoDescription: null,
    isPublic: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "wt-6",
    name: "Strength and Hypertrophy Workout",
    slug: "strength-and-hypertrophy-workout",
    goal: "strength",
    difficulty: "intermediate",
    estimatedDurationMinutes: 65,
    equipment: ["barbell", "dumbbell", "cable", "machine"],
    overview: null,
    whoItIsFor: null,
    warmupGuidance: null,
    progressionGuidance: null,
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 4,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders", "arms"],
    seoTitle: null,
    seoDescription: null,
    isPublic: true,
    createdAt: null,
    updatedAt: null,
  },
];

test("recommendWorkoutTemplates selects beginner weight loss when the goal and schedule match", () => {
  const result = recommendWorkoutTemplates(
    {
      goal: "weight-loss",
      experience: "beginner",
      equipment: "home",
      daysPerWeek: 3,
      workoutDuration: "30-45",
      focusArea: "full-body",
    },
    templates,
  );

  assert.equal(result.recommended?.template.slug, "beginner-weight-loss-workout");
});

test("recommendWorkoutTemplates prefers a balanced 4-day split for general muscle gain", () => {
  const result = recommendWorkoutTemplates(
    {
      goal: "muscle-gain",
      experience: "intermediate",
      equipment: "full-gym",
      daysPerWeek: 4,
      workoutDuration: "45-60",
      focusArea: "full-body",
    },
    templates,
  );

  assert.equal(result.recommended?.template.slug, "4-day-upper-lower-split");
});

test("recommendWorkoutTemplates returns the beginner strength option for generic beginner strength needs", () => {
  const result = recommendWorkoutTemplates(
    {
      goal: "strength",
      experience: "beginner",
      equipment: "full-gym",
      daysPerWeek: 3,
      workoutDuration: "45-60",
      focusArea: "full-body",
    },
    templates,
  );

  assert.equal(result.recommended?.template.slug, "beginner-strength-program");
});

test("recommendWorkoutTemplates returns a broader intermediate strength plan when no body-part focus is selected", () => {
  const result = recommendWorkoutTemplates(
    {
      goal: "strength",
      experience: "intermediate",
      equipment: "full-gym",
      daysPerWeek: 4,
      workoutDuration: "60-plus",
      focusArea: null,
    },
    templates,
  );

  assert.equal(result.recommended?.template.slug, "strength-and-hypertrophy-workout");
});
