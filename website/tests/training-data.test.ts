import assert from "node:assert/strict";
import test from "node:test";
import {
  getExercisesByCategorySlug,
  getRelatedWorkoutTemplatesForExercise,
  groupWorkoutExercisesByDay,
  joinTemplateExercises,
  type ExerciseRecord,
  type WorkoutTemplateExerciseRecord,
  type WorkoutTemplateRecord,
} from "../lib/training-data.ts";

const exercises: ExerciseRecord[] = [
  {
    id: "ex-1",
    name: "Bench Press",
    slug: "bench-press",
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: ["shoulders", "arms"],
    equipment: ["barbell"],
    movementPattern: "press",
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
  },
  {
    id: "ex-2",
    name: "Seated Cable Row",
    slug: "seated-cable-row",
    primaryMuscleGroup: "back",
    secondaryMuscleGroups: ["arms"],
    equipment: ["cable"],
    movementPattern: "pull",
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
  },
];

const workoutTemplates: WorkoutTemplateRecord[] = [
  {
    id: "wt-1",
    name: "Upper Workout",
    slug: "upper-workout",
    goal: "muscle-building",
    difficulty: "beginner",
    estimatedDurationMinutes: 45,
    equipment: ["barbell", "cable"],
    overview: null,
    whoItIsFor: null,
    warmupGuidance: null,
    progressionGuidance: null,
    experienceLevel: null,
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["chest", "back"],
    seoTitle: null,
    seoDescription: null,
    isPublic: true,
    createdAt: null,
    updatedAt: null,
  },
  {
    id: "wt-2",
    name: "Leg Workout",
    slug: "leg-workout",
    goal: "strength",
    difficulty: "intermediate",
    estimatedDurationMinutes: 50,
    equipment: ["barbell"],
    overview: null,
    whoItIsFor: null,
    warmupGuidance: null,
    progressionGuidance: null,
    experienceLevel: null,
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs"],
    seoTitle: null,
    seoDescription: null,
    isPublic: true,
    createdAt: null,
    updatedAt: null,
  },
];

const templateExercises: WorkoutTemplateExerciseRecord[] = [
  {
    id: "te-1",
    workoutTemplateId: "wt-1",
    exerciseId: "ex-1",
    exerciseName: "Bench Press",
    dayLabel: "Day 1",
    section: "Main work",
    sortOrder: 1,
    sets: "3",
    reps: "8",
    restSeconds: 90,
    notes: null,
    createdAt: null,
  },
  {
    id: "te-2",
    workoutTemplateId: "wt-1",
    exerciseId: "ex-2",
    exerciseName: "Seated Cable Row",
    dayLabel: "Day 1",
    section: "Main work",
    sortOrder: 2,
    sets: "3",
    reps: "10",
    restSeconds: 75,
    notes: null,
    createdAt: null,
  },
];

test("getExercisesByCategorySlug filters by muscle and equipment categories", () => {
  assert.deepEqual(
    getExercisesByCategorySlug(exercises, "chest").map((exercise) => exercise.slug),
    ["bench-press"],
  );
  assert.deepEqual(
    getExercisesByCategorySlug(exercises, "cable").map((exercise) => exercise.slug),
    ["seated-cable-row"],
  );
});

test("joinTemplateExercises and groupWorkoutExercisesByDay build grouped workout rows", () => {
  const joined = joinTemplateExercises(templateExercises, exercises, "wt-1");
  const grouped = groupWorkoutExercisesByDay(joined);

  assert.equal(joined[0]?.exercise?.slug, "bench-press");
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0]?.label, "Day 1");
  assert.equal(grouped[0]?.exercises.length, 2);
});

test("getRelatedWorkoutTemplatesForExercise prioritizes templates containing the exercise", () => {
  const related = getRelatedWorkoutTemplatesForExercise(exercises[0]!, workoutTemplates, templateExercises, 2);

  assert.equal(related[0]?.slug, "upper-workout");
});
