export type ExerciseRecord = {
  id: string;
  name: string;
  slug: string;
  primaryMuscleGroup: string | null;
  secondaryMuscleGroups: string[];
  equipment: string[];
  movementPattern: string | null;
  difficulty: string | null;
  exerciseType: string | null;
  isCompound: boolean;
  instructions: string[];
  commonMistakes: string[];
  benefits: string[];
  alternatives: string[];
  variations: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  source: string | null;
  sourceLicense: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type WorkoutTemplateRecord = {
  id: string;
  name: string;
  slug: string;
  goal: string | null;
  difficulty: string | null;
  estimatedDurationMinutes: number | null;
  equipment: string[];
  overview: string | null;
  whoItIsFor: string | null;
  warmupGuidance: string | null;
  progressionGuidance: string | null;
  experienceLevel: string | null;
  trainingDaysPerWeek: number | null;
  targetMuscleGroups: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  isPublic: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type WorkoutTemplateExerciseRecord = {
  id: string;
  workoutTemplateId: string;
  exerciseId: string | null;
  exerciseName: string;
  dayLabel: string | null;
  section: string | null;
  sortOrder: number;
  sets: string | null;
  reps: string | null;
  restSeconds: number | null;
  notes: string | null;
  createdAt: string | null;
};

export type TrainingDataSnapshot = {
  generatedAt: string | null;
  exercises: ExerciseRecord[];
  workoutTemplates: WorkoutTemplateRecord[];
  workoutTemplateExercises: WorkoutTemplateExerciseRecord[];
};

export type ExerciseCategoryInfo = {
  slug: string;
  title: string;
  label: string;
  description: string;
  kind: "muscle" | "equipment";
};

export type WorkoutGoalInfo = {
  slug: string;
  title: string;
  label: string;
  description: string;
};

export type ExerciseFaq = {
  question: string;
  answer: string;
};

export type WorkoutFaq = {
  question: string;
  answer: string;
};

export const EXERCISE_MUSCLE_CATEGORIES: readonly ExerciseCategoryInfo[] = [
  {
    slug: "chest",
    title: "Chest exercises",
    label: "Chest",
    description: "Explore chest exercises for pressing strength, hypertrophy, and cleaner upper-body training sessions.",
    kind: "muscle",
  },
  {
    slug: "back",
    title: "Back exercises",
    label: "Back",
    description: "Explore back exercises for rows, pulldowns, lats, upper-back strength, and posture support.",
    kind: "muscle",
  },
  {
    slug: "legs",
    title: "Leg exercises",
    label: "Legs",
    description: "Explore leg exercises for quads, hamstrings, calves, and overall lower-body strength.",
    kind: "muscle",
  },
  {
    slug: "shoulders",
    title: "Shoulder exercises",
    label: "Shoulders",
    description: "Explore shoulder exercises for pressing, delts, stability, and upper-body balance.",
    kind: "muscle",
  },
  {
    slug: "arms",
    title: "Arm exercises",
    label: "Arms",
    description: "Explore arm exercises for biceps, triceps, forearms, and cleaner accessory work.",
    kind: "muscle",
  },
  {
    slug: "core",
    title: "Core exercises",
    label: "Core",
    description: "Explore core exercises for trunk strength, bracing, and more stable lifting and movement.",
    kind: "muscle",
  },
  {
    slug: "glutes",
    title: "Glute exercises",
    label: "Glutes",
    description: "Explore glute exercises for hip drive, lower-body shape, and stronger hinge and squat patterns.",
    kind: "muscle",
  },
] as const;

export const EXERCISE_EQUIPMENT_CATEGORIES: readonly ExerciseCategoryInfo[] = [
  {
    slug: "barbell",
    title: "Barbell exercises",
    label: "Barbell",
    description: "Explore barbell exercises for compound strength, progressive overload, and gym-based training.",
    kind: "equipment",
  },
  {
    slug: "dumbbell",
    title: "Dumbbell exercises",
    label: "Dumbbell",
    description: "Explore dumbbell exercises for home workouts, unilateral training, and simpler setup.",
    kind: "equipment",
  },
  {
    slug: "cable",
    title: "Cable exercises",
    label: "Cable",
    description: "Explore cable exercises for controlled tension, accessories, and machine-based variety.",
    kind: "equipment",
  },
  {
    slug: "machine",
    title: "Machine exercises",
    label: "Machine",
    description: "Explore machine exercises for stable setup, easier learning, and focused training volume.",
    kind: "equipment",
  },
  {
    slug: "bodyweight",
    title: "Bodyweight exercises",
    label: "Bodyweight",
    description: "Explore bodyweight exercises for home training, circuits, and low-equipment progress.",
    kind: "equipment",
  },
  {
    slug: "kettlebell",
    title: "Kettlebell exercises",
    label: "Kettlebell",
    description: "Explore kettlebell exercises for full-body training, conditioning, and athletic movement patterns.",
    kind: "equipment",
  },
] as const;

export const WORKOUT_GOALS: readonly WorkoutGoalInfo[] = [
  {
    slug: "weight-loss",
    title: "Weight loss workouts",
    label: "Weight loss",
    description: "Explore workout templates built to support fat loss with realistic strength and conditioning structure.",
  },
  {
    slug: "muscle-building",
    title: "Muscle-building workouts",
    label: "Muscle building",
    description: "Explore workout templates built for hypertrophy, better training structure, and consistent gym progress.",
  },
  {
    slug: "beginner",
    title: "Beginner workouts",
    label: "Beginner",
    description: "Explore beginner-friendly workout templates with simple exercise choices and clear progression.",
  },
  {
    slug: "strength",
    title: "Strength workouts",
    label: "Strength",
    description: "Explore workout templates centered on the main lifts, repeatable progress, and better strength structure.",
  },
] as const;

const exerciseCategoryMap = new Map(
  [...EXERCISE_MUSCLE_CATEGORIES, ...EXERCISE_EQUIPMENT_CATEGORIES].map((category) => [category.slug, category]),
);
const workoutGoalMap = new Map(WORKOUT_GOALS.map((goal) => [goal.slug, goal]));

const CANONICAL_MUSCLE_GROUP_ALIASES = new Map<string, string>([
  ["chest", "chest"],
  ["back", "back"],
  ["leg", "legs"],
  ["legs", "legs"],
  ["shoulder", "shoulders"],
  ["shoulders", "shoulders"],
  ["arm", "arms"],
  ["arms", "arms"],
  ["core", "core"],
  ["abs", "core"],
  ["abdominal", "core"],
  ["abdominals", "core"],
  ["glute", "glutes"],
  ["glutes", "glutes"],
  ["gluteus", "glutes"],
]);

export function titleCase(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatEquipmentLabel(value: string) {
  if (value === "bodyweight") return "Bodyweight";
  if (value === "ez-bar") return "EZ bar";
  if (value === "exercise-ball") return "Exercise ball";
  if (value === "foam-roll") return "Foam roller";
  if (value === "medicine-ball") return "Medicine ball";
  return titleCase(value);
}

export function formatDifficultyLabel(value: string | null) {
  if (!value) return "All levels";
  return titleCase(value);
}

export function formatExerciseTypeLabel(value: string | null) {
  if (!value) return "General exercise";
  if (value === "olympic-weightlifting") return "Olympic weightlifting";
  return titleCase(value);
}

export function formatGoalLabel(value: string | null) {
  if (!value) return "General fitness";
  return titleCase(value);
}

export function formatMovementPatternLabel(value: string | null) {
  if (!value) return "General";
  if (value === "single-leg") return "Single-leg";
  return titleCase(value);
}

export function formatMuscleLabel(value: string | null) {
  if (!value) return "Full body";
  return titleCase(value);
}

export function formatRestText(value: number | null) {
  if (value == null || value <= 0) return "Self-paced";
  if (value < 60) return `${value} sec`;
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} sec`;
}

export function isExerciseCategorySlug(slug: string) {
  return exerciseCategoryMap.has(slug);
}

export function getExerciseCategoryInfo(slug: string) {
  return exerciseCategoryMap.get(slug) ?? null;
}

export function isWorkoutGoalSlug(slug: string) {
  return workoutGoalMap.has(slug);
}

export function getWorkoutGoalInfo(slug: string) {
  return workoutGoalMap.get(slug) ?? null;
}

export function normalizeMuscleGroup(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return CANONICAL_MUSCLE_GROUP_ALIASES.get(normalized) ?? normalized;
}

export function matchesPrimaryMuscleCategory(exercise: ExerciseRecord, muscleGroup: string) {
  const normalizedCategory = normalizeMuscleGroup(muscleGroup);

  if (!normalizedCategory) {
    return false;
  }

  return normalizeMuscleGroup(exercise.primaryMuscleGroup) === normalizedCategory;
}

function matchesQuery(haystackParts: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  const haystack = haystackParts.filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

const LOW_QUALITY_SUBSTITUTION_PATTERN =
  /\b(with chains|with bands|reverse band|guillotine|behind the head|behind the neck|palms-down|palms-up|plate movers)\b/i;

function getExerciseFamilyTags(exerciseName: string) {
  const normalizedName = exerciseName.toLowerCase();
  const tags = new Set<string>();

  const familyMatchers: Array<[string, RegExp]> = [
    ["bench-press", /\bbench press\b/],
    ["incline-press", /\bincline\b.*\b(bench press|press)\b|\bhammer grip incline db bench press\b/],
    ["decline-press", /\bdecline\b.*\b(bench press|press)\b/],
    ["chest-press", /\bchest press\b/],
    ["push-up", /\bpush ?ups?\b/],
    ["dip", /\bdips?\b/],
    ["deadlift", /\bdeadlift\b/],
    ["squat", /\bsquat\b/],
    ["lunge", /\blunge\b/],
    ["row", /\brow\b/],
    ["pulldown", /\bpull ?down\b/],
    ["pull-up", /\bpull ?up\b/],
    ["curl", /\bcurls?\b/],
    ["pushdown", /\bpush ?down\b/],
    ["extension", /\bextensions?\b/],
    ["raise", /\braise\b/],
    ["fly", /\bflye?s?\b|\bpec deck\b/],
    ["plank", /\bplank\b/],
    ["sit-up", /\bsit[- ]?up\b/],
    ["crunch", /\bcrunch\b/],
    ["rollout", /\brollout\b/],
    ["bridge", /\bbridge\b/],
    ["thrust", /\bthrust\b/],
    ["pull-through", /\bpull through\b/],
  ];

  for (const [tag, pattern] of familyMatchers) {
    if (pattern.test(normalizedName)) {
      tags.add(tag);
    }
  }

  return [...tags];
}

export function getNormalizedExerciseMovementPattern(exercise: ExerciseRecord) {
  const pattern = (exercise.movementPattern ?? "general").toLowerCase();
  const name = exercise.name.toLowerCase();

  if (pattern === "horizontal-push" || pattern === "vertical-push" || pattern === "elbow-flexion" || pattern === "elbow-extension" || pattern === "chest-fly") {
    return pattern;
  }

  if (pattern === "press") {
    if (/\b(bench press|floor press|board press|pin press|chest press|push ?ups?|bench dips|dips - triceps version|jm press)\b/.test(name)) {
      return "horizontal-push";
    }

    if (/\b(shoulder press|push press|arnold)\b/.test(name)) {
      return "vertical-push";
    }
  }

  if (pattern === "curl") return "elbow-flexion";
  if (pattern === "extension") return "elbow-extension";

  if (pattern === "raise") {
    if ((/\b(flye?s?|pec deck)\b/.test(name) || /\bbutterfly\b/.test(name)) && !/\breverse\b/.test(name) && exercise.primaryMuscleGroup === "chest") {
      return "chest-fly";
    }
  }

  return pattern || "general";
}

function sharesExerciseFamily(left: ExerciseRecord, right: ExerciseRecord) {
  const leftTags = getExerciseFamilyTags(left.name);
  const rightTags = getExerciseFamilyTags(right.name);

  return leftTags.some((tag) => rightTags.includes(tag));
}

function sharesEquipment(left: ExerciseRecord, right: ExerciseRecord) {
  return left.equipment.some((item) => right.equipment.includes(item));
}

function sharesTrainingRole(left: ExerciseRecord, right: ExerciseRecord) {
  if (left.isCompound !== right.isCompound) {
    return false;
  }

  const leftPattern = getNormalizedExerciseMovementPattern(left);
  const rightPattern = getNormalizedExerciseMovementPattern(right);

  if (leftPattern === rightPattern) {
    return true;
  }

  if (!left.exerciseType || !right.exerciseType) {
    return sharesExerciseFamily(left, right);
  }

  return left.exerciseType === right.exerciseType && sharesExerciseFamily(left, right);
}

function isClearlyRelevantSecondaryMatch(exercise: ExerciseRecord, muscleGroup: string) {
  const normalizedCategory = normalizeMuscleGroup(muscleGroup);

  if (!normalizedCategory) {
    return false;
  }

  const normalizedSecondaries = exercise.secondaryMuscleGroups
    .map((group) => normalizeMuscleGroup(group))
    .filter((group): group is string => group != null);

  if (!normalizedSecondaries.includes(normalizedCategory)) {
    return false;
  }

  if (normalizedCategory === "glutes") {
    return matchesPrimaryMuscleCategory(exercise, "legs")
      && ["hinge", "squat", "single-leg", "general"].includes(exercise.movementPattern ?? "general");
  }

  return false;
}

function hasUnsafeSubstitutionMismatch(base: ExerciseRecord, candidate: ExerciseRecord) {
  const basePattern = getNormalizedExerciseMovementPattern(base);
  const candidatePattern = getNormalizedExerciseMovementPattern(candidate);

  if (candidate.slug === base.slug || candidate.primaryMuscleGroup !== base.primaryMuscleGroup) {
    return true;
  }

  if (basePattern === "horizontal-push" && ["elbow-flexion", "elbow-extension"].includes(candidatePattern)) {
    return true;
  }

  if (basePattern === "elbow-flexion" && candidatePattern !== "elbow-flexion") {
    return true;
  }

  if (basePattern === "elbow-extension" && candidatePattern !== "elbow-extension") {
    return true;
  }

  if (base.primaryMuscleGroup === "chest" && base.isCompound && candidate.primaryMuscleGroup === "arms") {
    return true;
  }

  if (base.primaryMuscleGroup === "arms" && base.isCompound && !candidate.isCompound) {
    return true;
  }

  if (base.isCompound && !candidate.isCompound && ["horizontal-push", "vertical-push", "pull", "hinge", "squat"].includes(basePattern)) {
    return true;
  }

  if (!base.isCompound && candidate.isCompound && ["elbow-flexion", "elbow-extension", "chest-fly"].includes(basePattern)) {
    return true;
  }

  return false;
}

export function getExerciseSubstitutionCompatibilityScore(base: ExerciseRecord, candidate: ExerciseRecord) {
  if (hasUnsafeSubstitutionMismatch(base, candidate)) {
    return -1;
  }

  const basePattern = getNormalizedExerciseMovementPattern(base);
  const candidatePattern = getNormalizedExerciseMovementPattern(candidate);
  const sameMovementPattern = candidatePattern === basePattern;
  const sameFamily = sharesExerciseFamily(base, candidate);

  if (!sameMovementPattern && !sameFamily) {
    return -1;
  }

  let score = 0;

  if (candidate.primaryMuscleGroup === base.primaryMuscleGroup) score += 5;
  if (sameMovementPattern) score += 4;
  if (sameFamily) score += 3;
  if (sharesEquipment(base, candidate)) score += 2;
  if (candidate.isCompound === base.isCompound) score += 2;
  if (sharesTrainingRole(base, candidate)) score += 1;
  if (candidate.exerciseType === base.exerciseType) score += 1;
  if (candidate.difficulty === base.difficulty) score += 1;
  if (LOW_QUALITY_SUBSTITUTION_PATTERN.test(candidate.name)) score -= 4;

  return score;
}

function isValidSubstitutionCandidate(base: ExerciseRecord, candidate: ExerciseRecord) {
  if (getExerciseSubstitutionCompatibilityScore(base, candidate) < 10) {
    return false;
  }

  return true;
}

function isValidVariationCandidate(base: ExerciseRecord, candidate: ExerciseRecord) {
  if (candidate.slug === base.slug || candidate.primaryMuscleGroup !== base.primaryMuscleGroup) {
    return false;
  }

  const sameMovementPattern =
    getNormalizedExerciseMovementPattern(candidate) === getNormalizedExerciseMovementPattern(base);
  const sameFamily = sharesExerciseFamily(base, candidate);

  if (!sameMovementPattern && !sameFamily) {
    return false;
  }

  return sharesEquipment(base, candidate) || sharesTrainingRole(base, candidate);
}

function getExerciseRelationshipScore(base: ExerciseRecord, candidate: ExerciseRecord) {
  let score = 0;

  if (candidate.primaryMuscleGroup === base.primaryMuscleGroup) score += 6;
  if (getNormalizedExerciseMovementPattern(candidate) === getNormalizedExerciseMovementPattern(base)) score += 4;
  if (sharesExerciseFamily(base, candidate)) score += 4;
  if (sharesEquipment(base, candidate)) score += 3;
  if (sharesTrainingRole(base, candidate)) score += 2;
  if (candidate.secondaryMuscleGroups.some((group) => base.secondaryMuscleGroups.includes(group))) score += 1;
  if (candidate.difficulty === base.difficulty) score += 1;

  return score;
}

export function searchExercises(exercises: ExerciseRecord[], query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return exercises;

  return exercises.filter((exercise) =>
    matchesQuery(
      [
        exercise.name,
        exercise.primaryMuscleGroup,
        exercise.secondaryMuscleGroups.join(" "),
        exercise.equipment.join(" "),
        exercise.movementPattern,
        exercise.exerciseType,
      ],
      trimmedQuery,
    ),
  );
}

export function filterExercisesByMuscleGroup(exercises: ExerciseRecord[], muscleGroup: string) {
  if (!muscleGroup || muscleGroup === "all") return exercises;

  return exercises.filter(
    (exercise) => matchesPrimaryMuscleCategory(exercise, muscleGroup),
  );
}

export function filterExercisesByEquipment(exercises: ExerciseRecord[], equipment: string) {
  if (!equipment || equipment === "all") return exercises;
  return exercises.filter((exercise) => exercise.equipment.includes(equipment));
}

export function getExercisesByCategorySlug(exercises: ExerciseRecord[], slug: string) {
  const category = getExerciseCategoryInfo(slug);
  if (!category) return [];

  if (category.kind === "equipment") {
    return filterExercisesByEquipment(exercises, category.slug);
  }

  return exercises.filter(
    (exercise) => matchesPrimaryMuscleCategory(exercise, category.slug),
  );
}

export function getSupportingExercisesByCategorySlug(exercises: ExerciseRecord[], slug: string) {
  const category = getExerciseCategoryInfo(slug);
  if (!category || category.kind === "equipment") {
    return [];
  }

  return exercises.filter(
    (exercise) => !matchesPrimaryMuscleCategory(exercise, category.slug) && isClearlyRelevantSecondaryMatch(exercise, category.slug),
  );
}

export function searchWorkoutTemplates(templates: WorkoutTemplateRecord[], query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return templates;

  return templates.filter((template) =>
    matchesQuery(
      [
        template.name,
        template.goal,
        template.difficulty,
        template.overview,
        template.whoItIsFor,
        template.targetMuscleGroups.join(" "),
        template.equipment.join(" "),
      ],
      trimmedQuery,
    ),
  );
}

export function filterWorkoutTemplatesByGoal(templates: WorkoutTemplateRecord[], goal: string) {
  if (!goal || goal === "all") return templates;
  return templates.filter((template) => template.goal === goal);
}

export function filterWorkoutTemplatesByDifficulty(templates: WorkoutTemplateRecord[], difficulty: string) {
  if (!difficulty || difficulty === "all") return templates;
  return templates.filter((template) => template.difficulty === difficulty);
}

export function getWorkoutTemplatesByGoal(templates: WorkoutTemplateRecord[], slug: string) {
  if (!isWorkoutGoalSlug(slug)) return [];
  return filterWorkoutTemplatesByGoal(templates, slug);
}

export function joinTemplateExercises(
  workoutTemplateExercises: WorkoutTemplateExerciseRecord[],
  exercises: ExerciseRecord[],
  workoutTemplateId: string,
) {
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  return workoutTemplateExercises
    .filter((entry) => entry.workoutTemplateId === workoutTemplateId)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.exerciseName.localeCompare(right.exerciseName))
    .map((entry) => ({
      ...entry,
      exercise: entry.exerciseId ? exerciseMap.get(entry.exerciseId) ?? null : null,
    }));
}

export function groupWorkoutExercisesByDay(
  entries: ReturnType<typeof joinTemplateExercises>,
) {
  const dayMap = new Map<
    string,
    {
      label: string;
      exercises: typeof entries;
    }
  >();

  for (const entry of entries) {
    const label = entry.dayLabel || "Main session";
    const existing = dayMap.get(label);

    if (existing) {
      existing.exercises.push(entry);
      continue;
    }

    dayMap.set(label, {
      label,
      exercises: [entry],
    });
  }

  return [...dayMap.values()];
}

export function getExerciseSubstitutions(exercise: ExerciseRecord, exercises: ExerciseRecord[], limit = 3) {
  const namedAlternatives = exercise.alternatives
    .map((name) => exercises.find((candidate) => candidate.name === name) ?? null)
    .filter((candidate): candidate is ExerciseRecord => candidate != null && isValidSubstitutionCandidate(exercise, candidate));

  if (namedAlternatives.length >= limit) {
    return namedAlternatives
      .sort(
        (left, right) =>
          getExerciseSubstitutionCompatibilityScore(exercise, right)
          - getExerciseSubstitutionCompatibilityScore(exercise, left),
      )
      .slice(0, limit);
  }

  const fallback = exercises.filter(
    (candidate) => isValidSubstitutionCandidate(exercise, candidate),
  );

  const deduped = [...namedAlternatives, ...fallback].filter(
    (candidate, index, collection) => collection.findIndex((entry) => entry.slug === candidate.slug) === index,
  );

  return deduped
    .sort(
      (left, right) =>
        getExerciseSubstitutionCompatibilityScore(exercise, right)
        - getExerciseSubstitutionCompatibilityScore(exercise, left),
    )
    .slice(0, limit);
}

export function getExerciseVariations(exercise: ExerciseRecord, exercises: ExerciseRecord[], limit = 3) {
  const namedVariations = exercise.variations
    .map((name) => exercises.find((candidate) => candidate.name === name) ?? null)
    .filter((candidate): candidate is ExerciseRecord => candidate != null && isValidVariationCandidate(exercise, candidate));

  if (namedVariations.length >= limit) {
    return namedVariations
      .sort((left, right) => getExerciseRelationshipScore(exercise, right) - getExerciseRelationshipScore(exercise, left))
      .slice(0, limit);
  }

  const fallback = exercises.filter(
    (candidate) => isValidVariationCandidate(exercise, candidate),
  );

  const deduped = [...namedVariations, ...fallback].filter(
    (candidate, index, collection) => collection.findIndex((entry) => entry.slug === candidate.slug) === index,
  );

  return deduped
    .sort((left, right) => getExerciseRelationshipScore(exercise, right) - getExerciseRelationshipScore(exercise, left))
    .slice(0, limit);
}

export function getRelatedExercises(exercise: ExerciseRecord, exercises: ExerciseRecord[], limit = 4) {
  return exercises
    .filter((candidate) => candidate.slug !== exercise.slug)
    .map((candidate) => {
      let score = 0;

      if (candidate.primaryMuscleGroup === exercise.primaryMuscleGroup) score += 4;
      if (getNormalizedExerciseMovementPattern(candidate) === getNormalizedExerciseMovementPattern(exercise)) score += 3;
      if (sharesExerciseFamily(exercise, candidate)) score += 3;
      if (candidate.difficulty === exercise.difficulty) score += 2;
      if (sharesEquipment(exercise, candidate)) score += 2;
      if (sharesTrainingRole(exercise, candidate)) score += 2;
      if (candidate.secondaryMuscleGroups.some((item) => exercise.secondaryMuscleGroups.includes(item))) score += 1;

      return { candidate, score };
    })
    .filter(
      (entry) =>
        entry.score > 0
        && (
          entry.candidate.primaryMuscleGroup === exercise.primaryMuscleGroup
          || getNormalizedExerciseMovementPattern(entry.candidate) === getNormalizedExerciseMovementPattern(exercise)
          || sharesExerciseFamily(exercise, entry.candidate)
        ),
    )
    .sort((left, right) => right.score - left.score || left.candidate.name.localeCompare(right.candidate.name))
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export function getRelatedWorkoutTemplatesForExercise(
  exercise: ExerciseRecord,
  templates: WorkoutTemplateRecord[],
  workoutTemplateExercises: WorkoutTemplateExerciseRecord[],
  limit = 4,
) {
  const templateIdsWithExercise = new Set(
    workoutTemplateExercises
      .filter((entry) => entry.exerciseId === exercise.id || entry.exerciseName === exercise.name)
      .map((entry) => entry.workoutTemplateId),
  );

  return templates
    .map((template) => {
      let score = 0;

      if (templateIdsWithExercise.has(template.id)) score += 5;
      if (template.targetMuscleGroups.includes(exercise.primaryMuscleGroup ?? "")) score += 3;
      if (template.equipment.some((item) => exercise.equipment.includes(item))) score += 1;

      return { template, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.template.name.localeCompare(right.template.name))
    .slice(0, limit)
    .map((entry) => entry.template);
}

export function getRelatedWorkoutTemplates(
  template: WorkoutTemplateRecord,
  templates: WorkoutTemplateRecord[],
  limit = 4,
) {
  return templates
    .filter((candidate) => candidate.slug !== template.slug)
    .map((candidate) => {
      let score = 0;
      if (candidate.goal === template.goal) score += 3;
      if (candidate.difficulty === template.difficulty) score += 2;
      if (candidate.targetMuscleGroups.some((group) => template.targetMuscleGroups.includes(group))) score += 2;
      if (candidate.equipment.some((item) => template.equipment.includes(item))) score += 1;

      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.candidate.name.localeCompare(right.candidate.name))
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export function getRelatedExercisesForWorkout(
  template: WorkoutTemplateRecord,
  exercises: ExerciseRecord[],
  templateExercises: WorkoutTemplateExerciseRecord[],
  limit = 6,
) {
  const entries = templateExercises.filter((entry) => entry.workoutTemplateId === template.id);
  const exerciseIds = new Set(entries.map((entry) => entry.exerciseId).filter(Boolean));
  const byId = exercises.filter((exercise) => exerciseIds.has(exercise.id));

  if (byId.length > 0) {
    return byId.slice(0, limit);
  }

  return exercises
    .filter(
      (exercise) =>
        template.targetMuscleGroups.includes(exercise.primaryMuscleGroup ?? "") ||
        exercise.equipment.some((item) => template.equipment.includes(item)),
    )
    .slice(0, limit);
}

export function buildExerciseSummary(exercise: ExerciseRecord) {
  const difficulty = formatDifficultyLabel(exercise.difficulty);
  const type = formatExerciseTypeLabel(exercise.exerciseType).toLowerCase();
  const muscle = formatMuscleLabel(exercise.primaryMuscleGroup).toLowerCase();

  if (exercise.equipment.length === 0) {
    return `${exercise.name} is a ${difficulty.toLowerCase()} ${type} that mainly trains your ${muscle}.`;
  }

  const primaryEquipment = formatEquipmentLabel(exercise.equipment[0]!).toLowerCase();
  return `${exercise.name} is a ${difficulty.toLowerCase()} ${type} that mainly trains your ${muscle} using ${primaryEquipment}.`;
}

export function buildWorkoutSummary(template: WorkoutTemplateRecord) {
  const difficulty = formatDifficultyLabel(template.difficulty).toLowerCase();
  const goal = formatGoalLabel(template.goal).toLowerCase();
  const duration =
    template.estimatedDurationMinutes != null
      ? `in about ${template.estimatedDurationMinutes} minutes`
      : "in a manageable session";

  return `${template.name} is a ${difficulty} workout template built for ${goal} ${duration}.`;
}

export function buildExerciseFaqs(exercise: ExerciseRecord): ExerciseFaq[] {
  return [
    {
      question: `What muscles does ${exercise.name} work?`,
      answer: `${exercise.name} mainly works the ${formatMuscleLabel(exercise.primaryMuscleGroup).toLowerCase()}. It can also involve ${exercise.secondaryMuscleGroups.length > 0 ? exercise.secondaryMuscleGroups.map((group) => formatMuscleLabel(group).toLowerCase()).join(", ") : "supporting muscles around the same region"} depending on your setup and range of motion.`,
    },
    {
      question: `Is ${exercise.name} beginner-friendly?`,
      answer: `${exercise.difficulty === "beginner" ? "Yes. This exercise is listed as beginner-friendly, which usually means the setup and learning curve are more manageable." : `It is listed as ${formatDifficultyLabel(exercise.difficulty).toLowerCase()}, so newer lifters may want to start lighter or use a simpler variation first.`}`,
    },
    {
      question: `What equipment do I need for ${exercise.name}?`,
      answer: exercise.equipment.length > 0
        ? `You will usually need ${exercise.equipment.map(formatEquipmentLabel).join(", ")} for this variation.`
        : "This variation does not require much dedicated equipment beyond a safe setup.",
    },
    {
      question: `How should I progress ${exercise.name}?`,
      answer: "Start by making the reps smoother and more repeatable. Once the whole set looks controlled, add a small amount of load or one extra rep at a time.",
    },
  ];
}

export function buildWorkoutFaqs(template: WorkoutTemplateRecord): WorkoutFaq[] {
  return [
    {
      question: `Who is ${template.name} best for?`,
      answer: template.whoItIsFor ?? `${template.name} works best for people who want a ${formatGoalLabel(template.goal).toLowerCase()} plan with a ${formatDifficultyLabel(template.difficulty).toLowerCase()} level of complexity.`,
    },
    {
      question: `How often should I run ${template.name}?`,
      answer:
        template.trainingDaysPerWeek != null
          ? `This template is structured around about ${template.trainingDaysPerWeek} training day${template.trainingDaysPerWeek === 1 ? "" : "s"} per week.`
          : "Use this template on the schedule that best matches your recovery and available training days.",
    },
    {
      question: `Can I swap exercises in ${template.name}?`,
      answer: "Yes. The cleanest swaps are exercises that train the same main muscle group with similar equipment and a similar movement pattern.",
    },
    {
      question: `How do I progress this workout over time?`,
      answer: template.progressionGuidance ?? "Try to improve load, reps, or control gradually instead of changing the whole workout every week.",
    },
  ];
}

export const EMPTY_TRAINING_SNAPSHOT: TrainingDataSnapshot = {
  generatedAt: null,
  exercises: [],
  workoutTemplates: [],
  workoutTemplateExercises: [],
};
