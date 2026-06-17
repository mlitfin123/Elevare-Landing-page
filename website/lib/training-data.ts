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

function matchesQuery(haystackParts: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  const haystack = haystackParts.filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
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
    (exercise) =>
      exercise.primaryMuscleGroup === muscleGroup || exercise.secondaryMuscleGroups.includes(muscleGroup),
  );
}

export function filterExercisesByEquipment(exercises: ExerciseRecord[], equipment: string) {
  if (!equipment || equipment === "all") return exercises;
  return exercises.filter((exercise) => exercise.equipment.includes(equipment));
}

export function getExercisesByCategorySlug(exercises: ExerciseRecord[], slug: string) {
  const category = getExerciseCategoryInfo(slug);
  if (!category) return [];
  return category.kind === "muscle"
    ? filterExercisesByMuscleGroup(exercises, category.slug)
    : filterExercisesByEquipment(exercises, category.slug);
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
    .filter((candidate): candidate is ExerciseRecord => candidate != null)
    .slice(0, limit);

  if (namedAlternatives.length >= limit) {
    return namedAlternatives;
  }

  const fallback = exercises.filter(
    (candidate) =>
      candidate.slug !== exercise.slug &&
      candidate.primaryMuscleGroup === exercise.primaryMuscleGroup &&
      !candidate.equipment.some((item) => exercise.equipment.includes(item)),
  );

  return [...namedAlternatives, ...fallback].slice(0, limit);
}

export function getExerciseVariations(exercise: ExerciseRecord, exercises: ExerciseRecord[], limit = 3) {
  const namedVariations = exercise.variations
    .map((name) => exercises.find((candidate) => candidate.name === name) ?? null)
    .filter((candidate): candidate is ExerciseRecord => candidate != null)
    .slice(0, limit);

  if (namedVariations.length >= limit) {
    return namedVariations;
  }

  const fallback = exercises.filter(
    (candidate) =>
      candidate.slug !== exercise.slug &&
      candidate.primaryMuscleGroup === exercise.primaryMuscleGroup &&
      candidate.equipment.some((item) => exercise.equipment.includes(item)),
  );

  return [...namedVariations, ...fallback].slice(0, limit);
}

export function getRelatedExercises(exercise: ExerciseRecord, exercises: ExerciseRecord[], limit = 4) {
  return exercises
    .filter((candidate) => candidate.slug !== exercise.slug)
    .map((candidate) => {
      let score = 0;

      if (candidate.primaryMuscleGroup === exercise.primaryMuscleGroup) score += 4;
      if (candidate.difficulty === exercise.difficulty) score += 2;
      if (candidate.equipment.some((item) => exercise.equipment.includes(item))) score += 2;
      if (candidate.secondaryMuscleGroups.some((item) => exercise.secondaryMuscleGroups.includes(item))) score += 1;

      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
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
