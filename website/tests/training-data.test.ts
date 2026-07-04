import assert from "node:assert/strict";
import test from "node:test";
import {
  deduplicateExercises,
  getExerciseSubstitutions,
  getExercisesByCategorySlug,
  getSupportingExercisesByCategorySlug,
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
  {
    id: "ex-3",
    name: "Dumbbell Bench Press",
    slug: "dumbbell-bench-press",
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: ["shoulders", "arms"],
    equipment: ["dumbbell"],
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
    id: "ex-4",
    name: "Dumbbell Bicep Curl",
    slug: "dumbbell-bicep-curl",
    primaryMuscleGroup: "arms",
    secondaryMuscleGroups: [],
    equipment: ["dumbbell"],
    movementPattern: "elbow-flexion",
    difficulty: "beginner",
    exerciseType: "strength",
    isCompound: false,
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
    id: "ex-5",
    name: "Cable Chest Press",
    slug: "cable-chest-press",
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: ["shoulders", "arms"],
    equipment: ["cable"],
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
  },
  {
    id: "ex-6",
    name: "Pushups",
    slug: "pushups",
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: ["shoulders", "arms"],
    equipment: ["bodyweight"],
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
  },
  {
    id: "ex-7",
    name: "Dumbbell One-Arm Triceps Extension",
    slug: "dumbbell-one-arm-triceps-extension",
    primaryMuscleGroup: "arms",
    secondaryMuscleGroups: [],
    equipment: ["dumbbell"],
    movementPattern: "elbow-extension",
    difficulty: "beginner",
    exerciseType: "strength",
    isCompound: false,
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
    id: "ex-8",
    name: "Flat Bench Cable Flyes",
    slug: "flat-bench-cable-flyes",
    primaryMuscleGroup: "chest",
    secondaryMuscleGroups: [],
    equipment: ["cable"],
    movementPattern: "chest-fly",
    difficulty: "beginner",
    exerciseType: "strength",
    isCompound: false,
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
    id: "ex-9",
    name: "Close-Grip Barbell Bench Press",
    slug: "close-grip-barbell-bench-press",
    primaryMuscleGroup: "arms",
    secondaryMuscleGroups: ["chest", "shoulders"],
    equipment: ["barbell"],
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
  },
  {
    id: "ex-10",
    name: "Machine Chest Press",
    slug: "machine-chest-press",
    primaryMuscleGroup: "Chest",
    secondaryMuscleGroups: ["Shoulders", "Arms"],
    equipment: ["machine"],
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
  },
  {
    id: "ex-11",
    name: "Upper Chest Squeeze Press",
    slug: "upper-chest-squeeze-press",
    primaryMuscleGroup: "upper chest",
    secondaryMuscleGroups: ["arms"],
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
  },
  {
    id: "ex-12",
    name: "Barbell Split Squat",
    slug: "barbell-split-squat",
    primaryMuscleGroup: "legs",
    secondaryMuscleGroups: ["glutes"],
    equipment: ["barbell"],
    movementPattern: "single-leg",
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
    id: "ex-13",
    name: "Glute Bridge",
    slug: "glute-bridge",
    primaryMuscleGroup: "glutes",
    secondaryMuscleGroups: ["legs"],
    equipment: ["bodyweight"],
    movementPattern: "hinge",
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
    ["bench-press", "dumbbell-bench-press", "cable-chest-press", "pushups", "flat-bench-cable-flyes", "machine-chest-press"],
  );
  assert.deepEqual(
    getExercisesByCategorySlug(exercises, "cable").map((exercise) => exercise.slug),
    ["seated-cable-row", "cable-chest-press", "flat-bench-cable-flyes"],
  );
});

test("getExercisesByCategorySlug uses exact normalized primary muscle matches only", () => {
  assert.deepEqual(
    getExercisesByCategorySlug(exercises, "chest").map((exercise) => exercise.slug),
    ["bench-press", "dumbbell-bench-press", "cable-chest-press", "pushups", "flat-bench-cable-flyes", "machine-chest-press"],
  );

  assert.equal(
    getExercisesByCategorySlug(exercises, "chest").some((exercise) => exercise.slug === "close-grip-barbell-bench-press"),
    false,
  );
  assert.equal(
    getExercisesByCategorySlug(exercises, "chest").some((exercise) => exercise.slug === "upper-chest-squeeze-press"),
    false,
  );
});

test("getSupportingExercisesByCategorySlug keeps secondary-only matches out of the main list", () => {
  assert.deepEqual(
    getSupportingExercisesByCategorySlug(exercises, "glutes").map((exercise) => exercise.slug),
    ["barbell-split-squat"],
  );
  assert.equal(
    getExercisesByCategorySlug(exercises, "glutes").some((exercise) => exercise.slug === "barbell-split-squat"),
    false,
  );
});

test("deduplicateExercises prefers the canonical slug when the dataset contains hash-suffixed duplicates", () => {
  const duplicateExercises: ExerciseRecord[] = [
    {
      ...exercises[0]!,
      id: "bench-dup-1",
      name: "Bench Press - Powerlifting",
      slug: "bench-press-powerlifting-fcc9710c",
      difficulty: "intermediate",
      createdAt: "2026-07-03T21:48:52.921754+00:00",
    },
    {
      ...exercises[0]!,
      id: "bench-dup-2",
      name: "Bench Press - Powerlifting",
      slug: "bench-press-powerlifting",
      difficulty: "intermediate",
      createdAt: "2026-06-17T15:46:35.373546+00:00",
    },
    {
      ...exercises[0]!,
      id: "barbell-bench-dup-1",
      name: "Barbell Bench Press - Medium Grip",
      slug: "barbell-bench-press-medium-grip-77f3f617",
      createdAt: "2026-07-03T21:48:52.921754+00:00",
    },
    {
      ...exercises[0]!,
      id: "barbell-bench-dup-2",
      name: "Barbell Bench Press - Medium Grip",
      slug: "barbell-bench-press-medium-grip",
      createdAt: "2026-06-17T15:46:35.373546+00:00",
    },
  ];

  assert.deepEqual(
    deduplicateExercises(duplicateExercises).map((exercise) => exercise.slug),
    ["bench-press-powerlifting", "barbell-bench-press-medium-grip"],
  );
});

test("getExercisesByCategorySlug returns each canonical chest exercise only once", () => {
  const duplicateChestExercises: ExerciseRecord[] = [
    {
      ...exercises[0]!,
      id: "around-the-worlds-canonical",
      name: "Around The Worlds",
      slug: "around-the-worlds",
      equipment: ["dumbbell"],
      movementPattern: "general",
      createdAt: "2026-06-17T15:46:35.373546+00:00",
    },
    {
      ...exercises[0]!,
      id: "around-the-worlds-duplicate",
      name: "Around The Worlds",
      slug: "around-the-worlds-abf70144",
      equipment: ["dumbbell"],
      movementPattern: "general",
      createdAt: "2026-07-03T21:48:52.921754+00:00",
    },
    {
      ...exercises[0]!,
      id: "barbell-bench-canonical",
      name: "Barbell Bench Press - Medium Grip",
      slug: "barbell-bench-press-medium-grip",
      createdAt: "2026-06-17T15:46:35.373546+00:00",
    },
    {
      ...exercises[0]!,
      id: "barbell-bench-duplicate",
      name: "Barbell Bench Press - Medium Grip",
      slug: "barbell-bench-press-medium-grip-77f3f617",
      createdAt: "2026-07-03T21:48:52.921754+00:00",
    },
    {
      ...exercises[0]!,
      id: "bench-powerlifting-canonical",
      name: "Bench Press - Powerlifting",
      slug: "bench-press-powerlifting",
      difficulty: "intermediate",
      createdAt: "2026-06-17T15:46:35.373546+00:00",
    },
    {
      ...exercises[0]!,
      id: "bench-powerlifting-duplicate",
      name: "Bench Press - Powerlifting",
      slug: "bench-press-powerlifting-fcc9710c",
      difficulty: "intermediate",
      createdAt: "2026-07-03T21:48:52.921754+00:00",
    },
  ];

  assert.deepEqual(
    getExercisesByCategorySlug(duplicateChestExercises, "chest").map((exercise) => exercise.slug),
    ["around-the-worlds", "barbell-bench-press-medium-grip", "bench-press-powerlifting"],
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

test("getExerciseSubstitutions rejects curls and triceps isolation for bench-pattern substitutions", () => {
  const benchPress = {
    ...exercises[0]!,
    movementPattern: "horizontal-push",
    alternatives: ["Dumbbell Bicep Curl", "Dumbbell One-Arm Triceps Extension", "Cable Chest Press"],
  };

  const substitutions = getExerciseSubstitutions(benchPress, exercises, 3);

  assert.deepEqual(
    substitutions.map((exercise) => exercise.slug).sort(),
    ["dumbbell-bench-press", "pushups", "cable-chest-press"].sort(),
  );
});

test("getExerciseSubstitutions keeps close-grip bench substitutions in the same compound pressing lane", () => {
  const closeGripBench = {
    ...exercises[8]!,
    alternatives: ["Dumbbell One-Arm Triceps Extension", "Dumbbell Bicep Curl"],
  };

  const substitutions = getExerciseSubstitutions(closeGripBench, exercises, 3);

  assert.deepEqual(substitutions.map((exercise) => exercise.slug), []);
});
