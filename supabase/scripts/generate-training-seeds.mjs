import fs from "node:fs/promises";
import path from "node:path";

const sourcePath = process.env.EXERCISE_SOURCE_JSON
  ? path.resolve(process.env.EXERCISE_SOURCE_JSON)
  : path.join("C:\\", "tmp", "free-exercise-db.json");

const outputDir = path.join(process.cwd(), "supabase", "seed");
const exercisesOutputPath = path.join(outputDir, "exercises_seed.sql");
const workoutsOutputPath = path.join(outputDir, "workout_templates_seed.sql");
const bootstrapOutputPath = path.join(outputDir, "training_bootstrap.json");
const exerciseTargetCount = 320;

const MUSCLE_GROUP_MAP = new Map([
  ["abdominals", "core"],
  ["abductors", "glutes"],
  ["adductors", "legs"],
  ["biceps", "arms"],
  ["calves", "legs"],
  ["chest", "chest"],
  ["forearms", "arms"],
  ["glutes", "glutes"],
  ["hamstrings", "legs"],
  ["lats", "back"],
  ["lower back", "back"],
  ["middle back", "back"],
  ["neck", "shoulders"],
  ["quadriceps", "legs"],
  ["shoulders", "shoulders"],
  ["traps", "back"],
  ["triceps", "arms"],
]);

const EQUIPMENT_MAP = new Map([
  ["barbell", ["barbell"]],
  ["bands", ["band"]],
  ["body only", ["bodyweight"]],
  ["cable", ["cable"]],
  ["e-z curl bar", ["ez-bar"]],
  ["exercise ball", ["exercise-ball"]],
  ["foam roll", ["foam-roll"]],
  ["kettlebells", ["kettlebell"]],
  ["machine", ["machine"]],
  ["medicine ball", ["medicine-ball"]],
  ["other", ["other"]],
  ["", []],
  [null, []],
]);

const EQUIPMENT_PRIORITY = new Map([
  ["barbell", 120],
  ["dumbbell", 115],
  ["cable", 110],
  ["machine", 105],
  ["bodyweight", 100],
  ["kettlebell", 95],
  ["band", 90],
  ["ez-bar", 82],
  ["medicine-ball", 75],
  ["exercise-ball", 72],
  ["foam-roll", 68],
  ["other", 55],
]);

const CATEGORY_PRIORITY = new Map([
  ["strength", 28],
  ["powerlifting", 24],
  ["olympic-weightlifting", 20],
  ["plyometrics", 16],
  ["cardio", 12],
  ["stretching", 8],
  ["strongman", 6],
]);

const MUSCLE_PRIORITY = new Map([
  ["chest", 14],
  ["back", 14],
  ["legs", 14],
  ["shoulders", 12],
  ["arms", 10],
  ["core", 10],
  ["glutes", 9],
]);

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replaceAll("&", " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "") || "item";
}

function cleanText(value) {
  return String(value ?? "")
    .replaceAll("Â¾", "3/4")
    .replaceAll("Â½", "1/2")
    .replaceAll("Â", "")
    .replaceAll("\u2019", "'")
    .replaceAll("\u201c", '"')
    .replaceAll("\u201d", '"')
    .trim();
}

function quote(value) {
  return `'${cleanText(value).replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
}

function toSqlText(value) {
  if (value == null || cleanText(value) === "") {
    return "null";
  }

  return quote(value);
}

function toSqlBoolean(value) {
  return value ? "true" : "false";
}

function toSqlInteger(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "null";
  }

  return String(Math.trunc(Number(value)));
}

function toSqlTextArray(values) {
  const uniqueValues = [...new Set((values ?? []).map(cleanText).filter(Boolean))];

  if (uniqueValues.length === 0) {
    return "array[]::text[]";
  }

  return `array[${uniqueValues.map(quote).join(", ")}]::text[]`;
}

function normalizeCategory(category) {
  return slugify(cleanText(category));
}

function normalizeEquipment(equipment) {
  const normalized = EQUIPMENT_MAP.get(equipment ?? null);
  if (normalized) {
    return normalized;
  }

  return [slugify(equipment)];
}

function normalizeMuscle(muscle) {
  const cleaned = cleanText(muscle).toLowerCase();
  return MUSCLE_GROUP_MAP.get(cleaned) ?? (cleaned ? cleaned : "full-body");
}

function inferMovementPattern(exercise) {
  const haystack = `${exercise.name} ${exercise.category} ${exercise.force ?? ""}`.toLowerCase();

  if (haystack.includes("squat")) return "squat";
  if (haystack.includes("deadlift") || haystack.includes("good morning") || haystack.includes("hinge")) return "hinge";
  if (haystack.includes("press")) return "press";
  if (haystack.includes("row") || haystack.includes("pulldown") || haystack.includes("pull-up") || haystack.includes("chin-up"))
    return "pull";
  if (haystack.includes("lunge") || haystack.includes("split squat") || haystack.includes("step-up")) return "single-leg";
  if (haystack.includes("curl")) return "curl";
  if (haystack.includes("extension")) return "extension";
  if (haystack.includes("raise") || haystack.includes("fly")) return "raise";
  if (haystack.includes("plank") || haystack.includes("crunch") || haystack.includes("sit-up") || haystack.includes("twist"))
    return "core";
  if (haystack.includes("carry")) return "carry";

  return "general";
}

function inferBenefits(exercise, primaryMuscleGroup) {
  const benefits = [`Builds strength and control through the ${primaryMuscleGroup} region.`];

  if (exercise.mechanic === "compound") {
    benefits.push("Trains multiple joints at once, which can make your sessions more efficient.");
  } else {
    benefits.push("Makes it easier to focus on one area when you want extra practice or volume.");
  }

  if (normalizeCategory(exercise.category) === "stretching") {
    benefits.push("Can improve mobility and help you move more comfortably through the target range.");
  } else if (normalizeCategory(exercise.category) === "cardio") {
    benefits.push("Adds conditioning work that can support general fitness and work capacity.");
  } else {
    benefits.push("Gives you a repeatable way to track progress inside Logbook over time.");
  }

  return benefits;
}

function inferCommonMistakes(exercise) {
  const mistakes = ["Using more weight or speed than you can control cleanly."];
  const movementPattern = inferMovementPattern(exercise);

  if (movementPattern === "squat" || movementPattern === "hinge") {
    mistakes.push("Skipping the setup and losing tension before the first rep starts.");
  } else if (movementPattern === "press" || movementPattern === "pull") {
    mistakes.push("Letting momentum do the work instead of controlling the full rep.");
  } else {
    mistakes.push("Cutting the range of motion short and rushing through the reps.");
  }

  mistakes.push("Changing your body position between reps instead of keeping the movement repeatable.");
  return mistakes;
}

function buildExerciseRecord(exercise) {
  const slug = slugify(exercise.name);
  const primaryMuscleGroup = normalizeMuscle(exercise.primaryMuscles?.[0]);
  const secondaryMuscleGroups = [
    ...new Set(
      [...(exercise.secondaryMuscles ?? []), ...(exercise.primaryMuscles ?? []).slice(1)]
        .map(normalizeMuscle)
        .filter((group) => group && group !== primaryMuscleGroup),
    ),
  ];
  const equipment = normalizeEquipment(exercise.equipment).filter(Boolean);
  const movementPattern = inferMovementPattern(exercise);
  const difficulty = cleanText(exercise.level).toLowerCase() || null;
  const exerciseType = normalizeCategory(exercise.category);
  const instructions = (exercise.instructions ?? []).map(cleanText).filter(Boolean);
  const commonMistakes = inferCommonMistakes(exercise);
  const benefits = inferBenefits(exercise, primaryMuscleGroup);

  return {
    name: cleanText(exercise.name),
    slug,
    primaryMuscleGroup,
    secondaryMuscleGroups,
    equipment,
    movementPattern,
    difficulty,
    exerciseType,
    isCompound: cleanText(exercise.mechanic).toLowerCase() === "compound",
    instructions,
    commonMistakes,
    benefits,
    alternatives: [],
    variations: [],
    seoTitle: `${cleanText(exercise.name)} Exercise: Muscles Worked, Tips, and How To Do It`,
    seoDescription: `Learn how to do the ${cleanText(exercise.name)} exercise, which muscles it works, the equipment you need, and common mistakes to avoid.`,
    source: "free-exercise-db",
    sourceLicense: "Unlicense",
  };
}

function scoreExercise(record) {
  const equipmentScore = Math.max(...(record.equipment.length ? record.equipment : ["other"]).map((item) => EQUIPMENT_PRIORITY.get(item) ?? 40));
  const categoryScore = CATEGORY_PRIORITY.get(record.exerciseType) ?? 4;
  const muscleScore = MUSCLE_PRIORITY.get(record.primaryMuscleGroup) ?? 3;
  const instructionScore = Math.min(record.instructions.length, 6);
  const compoundScore = record.isCompound ? 8 : 4;

  return equipmentScore + categoryScore + muscleScore + instructionScore + compoundScore;
}

function enrichExerciseRelationships(records) {
  return records.map((record) => {
    const similar = records.filter((candidate) => candidate.slug !== record.slug && candidate.primaryMuscleGroup === record.primaryMuscleGroup);
    const variations = similar
      .filter((candidate) => candidate.equipment.some((item) => record.equipment.includes(item)))
      .slice(0, 3)
      .map((candidate) => candidate.name);
    const alternatives = similar
      .filter((candidate) => !candidate.equipment.some((item) => record.equipment.includes(item)))
      .slice(0, 3)
      .map((candidate) => candidate.name);

    return {
      ...record,
      variations,
      alternatives,
    };
  });
}

function templateSeed({
  name,
  slug,
  goal,
  difficulty,
  estimatedDurationMinutes,
  equipment,
  overview,
  whoItIsFor,
  warmupGuidance,
  progressionGuidance,
  experienceLevel,
  trainingDaysPerWeek,
  targetMuscleGroups,
  days,
}) {
  return {
    name,
    slug,
    goal,
    difficulty,
    estimatedDurationMinutes,
    equipment,
    overview,
    whoItIsFor,
    warmupGuidance,
    progressionGuidance,
    experienceLevel,
    trainingDaysPerWeek,
    targetMuscleGroups,
    seoTitle: `${name}: Free Workout Template for Logbook`,
    seoDescription: `${name} is a ${difficulty} workout template focused on ${goal.replaceAll("-", " ")} with exercises, sets, reps, and rest guidance.`,
    days,
  };
}

const WORKOUT_TEMPLATES = [
  templateSeed({
    name: "Beginner Full Body Workout",
    slug: "beginner-full-body-workout",
    goal: "beginner",
    difficulty: "beginner",
    estimatedDurationMinutes: 50,
    equipment: ["dumbbell", "bodyweight", "machine"],
    overview: "A simple full-body workout that teaches the basic movement patterns without burying beginners in volume.",
    whoItIsFor: "Someone new to lifting who wants a clear first program with a little bit of everything.",
    warmupGuidance: "Start with 5 minutes of light cardio, then do one easy warm-up set before each main lift.",
    progressionGuidance: "When every set feels smooth at the top of the rep range, add a small amount of weight the next session.",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders", "core"],
    days: [
      { dayLabel: "Main Session", section: "Main work", exerciseSlug: "goblet-squat", sets: "3", reps: "8-10", restSeconds: 90, notes: "Use a controlled descent and pause briefly at the bottom." },
      { dayLabel: "Main Session", section: "Main work", exerciseSlug: "dumbbell-bench-press", sets: "3", reps: "8-10", restSeconds: 90, notes: "Keep your feet planted and press through the full range." },
      { dayLabel: "Main Session", section: "Main work", exerciseSlug: "bodyweight-mid-row", sets: "3", reps: "8-12", restSeconds: 90, notes: "Adjust the bar height so every rep stays clean." },
      { dayLabel: "Main Session", section: "Accessories", exerciseSlug: "dumbbell-shoulder-press", sets: "2-3", reps: "10-12", restSeconds: 75, notes: "Stop each rep before your lower back overextends." },
      { dayLabel: "Main Session", section: "Accessories", exerciseSlug: "romanian-deadlift", sets: "2-3", reps: "8-10", restSeconds: 90, notes: "Keep the bar or dumbbells close to your legs." },
      { dayLabel: "Main Session", section: "Core", exerciseSlug: "plank", sets: "3", reps: "20-40 sec", restSeconds: 45, notes: "Brace hard and keep your ribs stacked over your hips." },
    ],
  }),
  templateSeed({
    name: "Beginner Weight Loss Workout",
    slug: "beginner-weight-loss-workout",
    goal: "weight-loss",
    difficulty: "beginner",
    estimatedDurationMinutes: 40,
    equipment: ["bodyweight", "dumbbell"],
    overview: "A low-complexity circuit that keeps you moving while still building basic strength.",
    whoItIsFor: "A beginner who wants a sustainable starting point for fat loss instead of an extreme plan.",
    warmupGuidance: "Walk for 5 minutes and practice one slow rehearsal set of each movement before the circuit starts.",
    progressionGuidance: "Add a round, a few reps, or a small amount of load before you jump straight to much harder exercises.",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders", "core"],
    days: [
      { dayLabel: "Circuit", section: "Circuit A", exerciseSlug: "bodyweight-squat", sets: "3", reps: "12-15", restSeconds: 30, notes: "Move at a steady pace and stay a few reps away from failure." },
      { dayLabel: "Circuit", section: "Circuit A", exerciseSlug: "push-ups", sets: "3", reps: "6-12", restSeconds: 30, notes: "Elevate your hands if needed so you can keep good form." },
      { dayLabel: "Circuit", section: "Circuit A", exerciseSlug: "bent-over-two-dumbbell-row", sets: "3", reps: "10-12", restSeconds: 30, notes: "Squeeze your upper back at the top of each rep." },
      { dayLabel: "Circuit", section: "Circuit B", exerciseSlug: "dumbbell-lunges", sets: "2-3", reps: "10 each side", restSeconds: 45, notes: "Use a stride length that lets you stay balanced." },
      { dayLabel: "Circuit", section: "Circuit B", exerciseSlug: "dumbbell-shoulder-press", sets: "2-3", reps: "10-12", restSeconds: 45, notes: "Keep the motion smooth and stop before your back arches." },
      { dayLabel: "Circuit", section: "Core", exerciseSlug: "3-4-sit-up", sets: "2-3", reps: "12-15", restSeconds: 30, notes: "Focus on control instead of speed." },
    ],
  }),
  templateSeed({
    name: "Beginner Dumbbell Workout",
    slug: "beginner-dumbbell-workout",
    goal: "beginner",
    difficulty: "beginner",
    estimatedDurationMinutes: 45,
    equipment: ["dumbbell", "bodyweight"],
    overview: "A full-body dumbbell session that works well in a home gym or a crowded commercial gym.",
    whoItIsFor: "Someone who only has dumbbells or wants to learn the basics before using barbells.",
    warmupGuidance: "Take one lighter warm-up set for the first lower-body and upper-body move.",
    progressionGuidance: "Own the full rep range first, then increase weight in the smallest jump available.",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders", "arms"],
    days: [
      { dayLabel: "Main Session", section: "Main work", exerciseSlug: "dumbbell-squat", sets: "3", reps: "10-12", restSeconds: 75, notes: "Use a heel stance that lets you keep the chest tall." },
      { dayLabel: "Main Session", section: "Main work", exerciseSlug: "dumbbell-bench-press", sets: "3", reps: "8-10", restSeconds: 90, notes: "Lower with control and keep both dumbbells even." },
      { dayLabel: "Main Session", section: "Main work", exerciseSlug: "bent-over-two-dumbbell-row", sets: "3", reps: "10-12", restSeconds: 75, notes: "Pause at the top to feel the upper back work." },
      { dayLabel: "Main Session", section: "Accessories", exerciseSlug: "dumbbell-shoulder-press", sets: "3", reps: "8-10", restSeconds: 75, notes: "Press straight up instead of forward." },
      { dayLabel: "Main Session", section: "Accessories", exerciseSlug: "dumbbell-bicep-curl", sets: "2-3", reps: "10-12", restSeconds: 45, notes: "Keep the elbows from drifting forward." },
      { dayLabel: "Main Session", section: "Accessories", exerciseSlug: "dumbbell-one-arm-triceps-extension", sets: "2-3", reps: "10-12 each side", restSeconds: 45, notes: "Use a weight you can control overhead." },
    ],
  }),
  templateSeed({
    name: "Beginner Gym Workout",
    slug: "beginner-gym-workout",
    goal: "beginner",
    difficulty: "beginner",
    estimatedDurationMinutes: 50,
    equipment: ["machine", "cable", "bodyweight"],
    overview: "A beginner-friendly gym session built around stable machines and simple cable patterns.",
    whoItIsFor: "Someone brand new to the gym floor who wants a little more support and stability.",
    warmupGuidance: "Use 5 minutes of easy cardio and one lighter warm-up set on the first two machines.",
    progressionGuidance: "Only move the pin up after you hit every prescribed rep without grinding.",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders", "core"],
    days: [
      { dayLabel: "Main Session", section: "Main work", exerciseSlug: "leg-press", sets: "3", reps: "10-12", restSeconds: 90, notes: "Lower as far as you can while keeping your low back supported." },
      { dayLabel: "Main Session", section: "Main work", exerciseSlug: "cable-chest-press", sets: "3", reps: "10-12", restSeconds: 75, notes: "Keep the shoulders down and finish with a soft bend in the elbows." },
      { dayLabel: "Main Session", section: "Main work", exerciseSlug: "wide-grip-lat-pulldown", sets: "3", reps: "8-12", restSeconds: 75, notes: "Pull to the upper chest instead of behind the neck." },
      { dayLabel: "Main Session", section: "Accessories", exerciseSlug: "seated-cable-shoulder-press", sets: "2-3", reps: "10-12", restSeconds: 75, notes: "Stay stacked and avoid leaning back." },
      { dayLabel: "Main Session", section: "Accessories", exerciseSlug: "seated-cable-rows", sets: "2-3", reps: "10-12", restSeconds: 75, notes: "Drive the elbows back without shrugging up." },
      { dayLabel: "Main Session", section: "Core", exerciseSlug: "ab-crunch-machine", sets: "2-3", reps: "12-15", restSeconds: 45, notes: "Move slowly and let the abs do the work." },
    ],
  }),
  templateSeed({
    name: "Beginner Home Workout",
    slug: "beginner-home-workout",
    goal: "beginner",
    difficulty: "beginner",
    estimatedDurationMinutes: 35,
    equipment: ["bodyweight"],
    overview: "A bodyweight-only starting plan you can run at home with very little setup.",
    whoItIsFor: "Someone who wants a realistic at-home plan before buying more equipment.",
    warmupGuidance: "Walk around for a few minutes, then do a slow practice round of the circuit.",
    progressionGuidance: "Add reps first. When that gets easy, shorten rest periods or add a fourth round.",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "arms", "core"],
    days: [
      { dayLabel: "Circuit", section: "Circuit A", exerciseSlug: "bodyweight-squat", sets: "3", reps: "12-20", restSeconds: 30, notes: "Keep the pace steady and stay upright." },
      { dayLabel: "Circuit", section: "Circuit A", exerciseSlug: "push-ups", sets: "3", reps: "6-15", restSeconds: 30, notes: "Use an incline if you need a cleaner version." },
      { dayLabel: "Circuit", section: "Circuit A", exerciseSlug: "bodyweight-walking-lunge", sets: "3", reps: "10 each side", restSeconds: 30, notes: "Take controlled steps and stay balanced." },
      { dayLabel: "Circuit", section: "Circuit B", exerciseSlug: "bench-dips", sets: "2-3", reps: "8-12", restSeconds: 45, notes: "Keep the shoulders comfortable and do not drop too deep." },
      { dayLabel: "Circuit", section: "Circuit B", exerciseSlug: "3-4-sit-up", sets: "2-3", reps: "12-15", restSeconds: 30, notes: "Use a smooth rhythm instead of jerking upward." },
      { dayLabel: "Circuit", section: "Circuit B", exerciseSlug: "plank", sets: "2-3", reps: "20-40 sec", restSeconds: 30, notes: "Think ribs down and glutes tight." },
    ],
  }),
  templateSeed({
    name: "Push Day Workout",
    slug: "push-day-workout",
    goal: "muscle-building",
    difficulty: "intermediate",
    estimatedDurationMinutes: 65,
    equipment: ["barbell", "dumbbell", "cable"],
    overview: "A classic push day for chest, shoulders, and triceps with a balance of compound and accessory work.",
    whoItIsFor: "Lifters who already know the basics and want a clean upper-body push session.",
    warmupGuidance: "Warm up your shoulders and upper back, then climb in weight with 2 to 3 ramp-up sets on the first press.",
    progressionGuidance: "Drive progress through the first two presses first, then add reps or load on accessories as recovery allows.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 5,
    targetMuscleGroups: ["chest", "shoulders", "arms"],
    days: [
      { dayLabel: "Push", section: "Primary presses", exerciseSlug: "barbell-bench-press-medium-grip", sets: "4", reps: "5-8", restSeconds: 150, notes: "Use the same setup every set so bar path stays repeatable." },
      { dayLabel: "Push", section: "Primary presses", exerciseSlug: "barbell-incline-bench-press-medium-grip", sets: "3-4", reps: "6-10", restSeconds: 120, notes: "Drive the upper chest without turning it into a shoulder press." },
      { dayLabel: "Push", section: "Shoulders", exerciseSlug: "dumbbell-shoulder-press", sets: "3", reps: "8-10", restSeconds: 90, notes: "Stay stacked and avoid leaning back." },
      { dayLabel: "Push", section: "Shoulders", exerciseSlug: "side-lateral-raise", sets: "3", reps: "12-15", restSeconds: 45, notes: "Lift with control and avoid swinging the torso." },
      { dayLabel: "Push", section: "Triceps", exerciseSlug: "close-grip-barbell-bench-press", sets: "3", reps: "6-8", restSeconds: 120, notes: "Keep the elbows tucked and control the bottom position." },
      { dayLabel: "Push", section: "Triceps", exerciseSlug: "reverse-grip-triceps-pushdown", sets: "3", reps: "10-15", restSeconds: 45, notes: "Focus on full elbow lockout without rolling the shoulders forward." },
    ],
  }),
  templateSeed({
    name: "Pull Day Workout",
    slug: "pull-day-workout",
    goal: "muscle-building",
    difficulty: "intermediate",
    estimatedDurationMinutes: 65,
    equipment: ["barbell", "cable", "bodyweight"],
    overview: "A pull day built around back thickness, back width, and direct arm work.",
    whoItIsFor: "Lifters who want a simple back and biceps session they can progress for months.",
    warmupGuidance: "Do a few shoulder circles, a couple sets of band or cable rows, and then ramp into the first rowing movement.",
    progressionGuidance: "Chase better form and load on the main row before making the accessory work more complicated.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 5,
    targetMuscleGroups: ["back", "arms"],
    days: [
      { dayLabel: "Pull", section: "Primary pulls", exerciseSlug: "bent-over-barbell-row", sets: "4", reps: "6-8", restSeconds: 150, notes: "Brace hard and keep the torso angle consistent." },
      { dayLabel: "Pull", section: "Primary pulls", exerciseSlug: "wide-grip-lat-pulldown", sets: "3-4", reps: "8-10", restSeconds: 90, notes: "Drive the elbows down instead of yanking with the hands." },
      { dayLabel: "Pull", section: "Upper back", exerciseSlug: "seated-cable-rows", sets: "3", reps: "8-12", restSeconds: 90, notes: "Pause briefly against the torso." },
      { dayLabel: "Pull", section: "Upper back", exerciseSlug: "straight-arm-pulldown", sets: "3", reps: "10-15", restSeconds: 45, notes: "Keep a small bend in the elbows and move from the shoulders." },
      { dayLabel: "Pull", section: "Biceps", exerciseSlug: "barbell-curl", sets: "3", reps: "8-10", restSeconds: 60, notes: "Do not let the lower back create the rep." },
      { dayLabel: "Pull", section: "Biceps", exerciseSlug: "alternate-hammer-curl", sets: "3", reps: "10-12", restSeconds: 45, notes: "Let the arms fully extend before the next rep." },
    ],
  }),
  templateSeed({
    name: "Leg Day Workout",
    slug: "leg-day-workout",
    goal: "muscle-building",
    difficulty: "intermediate",
    estimatedDurationMinutes: 70,
    equipment: ["barbell", "machine", "bodyweight"],
    overview: "A leg day that covers squat strength, posterior-chain work, and enough accessory volume to grow.",
    whoItIsFor: "Someone who wants a balanced lower-body session instead of only squats and leg press.",
    warmupGuidance: "Warm up the hips and ankles, then build into the first squat pattern with 3 to 4 ramp-up sets.",
    progressionGuidance: "Treat the squat and hinge as the main drivers of progress, then use the accessories to add controlled volume.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 5,
    targetMuscleGroups: ["legs", "glutes"],
    days: [
      { dayLabel: "Legs", section: "Primary lower body", exerciseSlug: "barbell-squat", sets: "4", reps: "5-8", restSeconds: 180, notes: "Keep the same stance and brace before every rep." },
      { dayLabel: "Legs", section: "Primary lower body", exerciseSlug: "leg-press", sets: "3", reps: "10-12", restSeconds: 120, notes: "Use a depth you can control without the hips rolling." },
      { dayLabel: "Legs", section: "Posterior chain", exerciseSlug: "romanian-deadlift", sets: "3", reps: "8-10", restSeconds: 120, notes: "Think hips back and keep tension through the hamstrings." },
      { dayLabel: "Legs", section: "Accessories", exerciseSlug: "leg-extensions", sets: "3", reps: "12-15", restSeconds: 60, notes: "Pause the lockout instead of bouncing through it." },
      { dayLabel: "Legs", section: "Accessories", exerciseSlug: "lying-leg-curls", sets: "3", reps: "10-15", restSeconds: 60, notes: "Stay controlled on the lowering phase." },
      { dayLabel: "Legs", section: "Finishers", exerciseSlug: "calf-press-on-the-leg-press-machine", sets: "3", reps: "12-20", restSeconds: 45, notes: "Use a full stretch and squeeze each rep." },
    ],
  }),
  templateSeed({
    name: "Upper Body Workout",
    slug: "upper-body-workout",
    goal: "muscle-building",
    difficulty: "intermediate",
    estimatedDurationMinutes: 60,
    equipment: ["barbell", "cable", "dumbbell"],
    overview: "A balanced upper-body day built around pressing, rowing, pulling, and arm accessories.",
    whoItIsFor: "Lifters who want a straightforward upper session they can run once or twice per week.",
    warmupGuidance: "Prime the upper back and shoulders first, then take a few ramp-up sets on the main press.",
    progressionGuidance: "Progress the first press and row as a pair, then add small improvements on the rest of the session.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 4,
    targetMuscleGroups: ["chest", "back", "shoulders", "arms"],
    days: [
      { dayLabel: "Upper", section: "Primary lifts", exerciseSlug: "barbell-bench-press-medium-grip", sets: "4", reps: "5-8", restSeconds: 150, notes: "Use a setup you can repeat every week." },
      { dayLabel: "Upper", section: "Primary lifts", exerciseSlug: "bent-over-barbell-row", sets: "4", reps: "6-8", restSeconds: 150, notes: "Own the torso angle and row to the same point each rep." },
      { dayLabel: "Upper", section: "Secondary work", exerciseSlug: "wide-grip-lat-pulldown", sets: "3", reps: "8-12", restSeconds: 90, notes: "Think elbows down and chest tall." },
      { dayLabel: "Upper", section: "Secondary work", exerciseSlug: "dumbbell-shoulder-press", sets: "3", reps: "8-10", restSeconds: 75, notes: "Keep the dumbbells stacked over the elbows." },
      { dayLabel: "Upper", section: "Arms", exerciseSlug: "ez-bar-curl", sets: "3", reps: "10-12", restSeconds: 45, notes: "Use the full range instead of half reps." },
      { dayLabel: "Upper", section: "Arms", exerciseSlug: "reverse-grip-triceps-pushdown", sets: "3", reps: "10-12", restSeconds: 45, notes: "Keep the upper arm quiet and lock out hard." },
    ],
  }),
  templateSeed({
    name: "Lower Body Workout",
    slug: "lower-body-workout",
    goal: "muscle-building",
    difficulty: "intermediate",
    estimatedDurationMinutes: 65,
    equipment: ["barbell", "dumbbell", "machine"],
    overview: "A lower-body template that covers squat strength, single-leg work, and posterior-chain volume.",
    whoItIsFor: "Lifters who want a lower day that is productive without being overly complicated.",
    warmupGuidance: "Mobilize hips and ankles, then build into the first squat movement with several small jumps.",
    progressionGuidance: "Add weight slowly on the main squat pattern and use the accessories to own more reps before more load.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 4,
    targetMuscleGroups: ["legs", "glutes"],
    days: [
      { dayLabel: "Lower", section: "Primary lower body", exerciseSlug: "front-barbell-squat", sets: "4", reps: "4-6", restSeconds: 180, notes: "Drive the elbows up and stay tall out of the hole." },
      { dayLabel: "Lower", section: "Primary lower body", exerciseSlug: "romanian-deadlift", sets: "3", reps: "6-8", restSeconds: 150, notes: "Do not lose lat tension on the way down." },
      { dayLabel: "Lower", section: "Single-leg", exerciseSlug: "dumbbell-lunges", sets: "3", reps: "8-10 each side", restSeconds: 75, notes: "Use a steady step and finish balanced." },
      { dayLabel: "Lower", section: "Accessories", exerciseSlug: "leg-press", sets: "3", reps: "10-12", restSeconds: 90, notes: "Push through the full foot and control the descent." },
      { dayLabel: "Lower", section: "Accessories", exerciseSlug: "lying-leg-curls", sets: "3", reps: "10-15", restSeconds: 60, notes: "Keep the hips pinned down." },
      { dayLabel: "Lower", section: "Finishers", exerciseSlug: "calf-press-on-the-leg-press-machine", sets: "3", reps: "12-20", restSeconds: 45, notes: "Pause in the stretched position briefly." },
    ],
  }),
  templateSeed({
    name: "3-Day Full Body Split",
    slug: "3-day-full-body-split",
    goal: "muscle-building",
    difficulty: "beginner",
    estimatedDurationMinutes: 55,
    equipment: ["barbell", "dumbbell", "cable", "bodyweight"],
    overview: "A three-day split that spreads total weekly work across three full-body sessions.",
    whoItIsFor: "Someone who can train three days per week and wants steady progress without body-part specialization yet.",
    warmupGuidance: "Use 5 minutes of easy cardio plus one to three ramp-up sets before the first compound lift on each day.",
    progressionGuidance: "Aim to improve one big lift and one accessory on each day before adding more overall volume.",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders", "arms"],
    days: [
      { dayLabel: "Day 1", section: "Main work", exerciseSlug: "barbell-squat", sets: "4", reps: "5-6", restSeconds: 150, notes: "Stay a rep or two shy of failure." },
      { dayLabel: "Day 1", section: "Main work", exerciseSlug: "barbell-bench-press-medium-grip", sets: "4", reps: "5-8", restSeconds: 150, notes: "Repeat the same bar path every set." },
      { dayLabel: "Day 1", section: "Main work", exerciseSlug: "wide-grip-lat-pulldown", sets: "3", reps: "8-10", restSeconds: 75, notes: "Control the return." },
      { dayLabel: "Day 2", section: "Main work", exerciseSlug: "romanian-deadlift", sets: "4", reps: "6-8", restSeconds: 150, notes: "Keep tension the whole set." },
      { dayLabel: "Day 2", section: "Main work", exerciseSlug: "dumbbell-shoulder-press", sets: "3", reps: "8-10", restSeconds: 75, notes: "Press from a stable torso." },
      { dayLabel: "Day 2", section: "Main work", exerciseSlug: "seated-cable-rows", sets: "3", reps: "8-12", restSeconds: 75, notes: "Use a full squeeze." },
      { dayLabel: "Day 3", section: "Main work", exerciseSlug: "leg-press", sets: "3", reps: "10-12", restSeconds: 90, notes: "Stay smooth and controlled." },
      { dayLabel: "Day 3", section: "Main work", exerciseSlug: "barbell-incline-bench-press-medium-grip", sets: "3", reps: "8-10", restSeconds: 90, notes: "Drive through the upper chest." },
      { dayLabel: "Day 3", section: "Main work", exerciseSlug: "bent-over-barbell-row", sets: "3", reps: "8-10", restSeconds: 90, notes: "Do not let the torso drift." },
    ],
  }),
  templateSeed({
    name: "4-Day Upper Lower Split",
    slug: "4-day-upper-lower-split",
    goal: "muscle-building",
    difficulty: "intermediate",
    estimatedDurationMinutes: 60,
    equipment: ["barbell", "dumbbell", "cable", "machine"],
    overview: "A simple four-day split that gives each half of the body two quality sessions each week.",
    whoItIsFor: "Someone beyond the beginner stage who wants structure without a five- or six-day schedule.",
    warmupGuidance: "Warm up separately for the first press or squat on each day, then take one lighter set before the next big lift.",
    progressionGuidance: "Rotate your focus between load on the first compounds and rep quality on the secondary work.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 4,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders", "arms"],
    days: [
      { dayLabel: "Upper A", section: "Primary lifts", exerciseSlug: "barbell-bench-press-medium-grip", sets: "4", reps: "5-8", restSeconds: 150, notes: "Main press for the week." },
      { dayLabel: "Upper A", section: "Primary lifts", exerciseSlug: "bent-over-barbell-row", sets: "4", reps: "6-8", restSeconds: 150, notes: "Row hard but stay braced." },
      { dayLabel: "Upper A", section: "Accessories", exerciseSlug: "dumbbell-shoulder-press", sets: "3", reps: "8-10", restSeconds: 75, notes: "Stack the dumbbells over the elbows." },
      { dayLabel: "Lower A", section: "Primary lifts", exerciseSlug: "barbell-squat", sets: "4", reps: "5-6", restSeconds: 180, notes: "Treat this as the heavy squat day." },
      { dayLabel: "Lower A", section: "Primary lifts", exerciseSlug: "romanian-deadlift", sets: "3", reps: "6-8", restSeconds: 150, notes: "Use the hamstrings, not momentum." },
      { dayLabel: "Lower A", section: "Accessories", exerciseSlug: "leg-extensions", sets: "3", reps: "12-15", restSeconds: 60, notes: "Own the lockout." },
      { dayLabel: "Upper B", section: "Primary lifts", exerciseSlug: "barbell-incline-bench-press-medium-grip", sets: "4", reps: "6-10", restSeconds: 120, notes: "Slightly higher-rep pressing day." },
      { dayLabel: "Upper B", section: "Primary lifts", exerciseSlug: "wide-grip-lat-pulldown", sets: "4", reps: "8-10", restSeconds: 90, notes: "Move cleanly through the full range." },
      { dayLabel: "Upper B", section: "Accessories", exerciseSlug: "ez-bar-curl", sets: "3", reps: "10-12", restSeconds: 45, notes: "Control both sides evenly." },
      { dayLabel: "Lower B", section: "Primary lifts", exerciseSlug: "front-barbell-squat", sets: "3", reps: "4-6", restSeconds: 180, notes: "Stay tall and drive up." },
      { dayLabel: "Lower B", section: "Primary lifts", exerciseSlug: "leg-press", sets: "3", reps: "10-12", restSeconds: 90, notes: "Control the descent." },
      { dayLabel: "Lower B", section: "Accessories", exerciseSlug: "lying-leg-curls", sets: "3", reps: "10-15", restSeconds: 60, notes: "Keep the motion smooth." },
    ],
  }),
  templateSeed({
    name: "5-Day Bodybuilding Split",
    slug: "5-day-bodybuilding-split",
    goal: "muscle-building",
    difficulty: "intermediate",
    estimatedDurationMinutes: 70,
    equipment: ["barbell", "dumbbell", "cable", "machine"],
    overview: "A traditional five-day bodybuilding split for lifters who enjoy focusing on one or two regions per session.",
    whoItIsFor: "Someone who can recover from higher weekly volume and likes dedicated body-part days.",
    warmupGuidance: "Use targeted mobility and ramp-up sets for the first compound on each day.",
    progressionGuidance: "Keep the main compound stable from block to block and rotate smaller accessories as needed.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 5,
    targetMuscleGroups: ["chest", "back", "legs", "shoulders", "arms"],
    days: [
      { dayLabel: "Chest", section: "Primary work", exerciseSlug: "barbell-bench-press-medium-grip", sets: "4", reps: "5-8", restSeconds: 150, notes: "Primary chest driver." },
      { dayLabel: "Chest", section: "Accessories", exerciseSlug: "flat-bench-cable-flyes", sets: "3", reps: "12-15", restSeconds: 45, notes: "Stretch and squeeze." },
      { dayLabel: "Back", section: "Primary work", exerciseSlug: "bent-over-barbell-row", sets: "4", reps: "6-8", restSeconds: 150, notes: "Back thickness focus." },
      { dayLabel: "Back", section: "Accessories", exerciseSlug: "wide-grip-lat-pulldown", sets: "3", reps: "8-12", restSeconds: 75, notes: "Back width focus." },
      { dayLabel: "Legs", section: "Primary work", exerciseSlug: "barbell-squat", sets: "4", reps: "5-8", restSeconds: 180, notes: "Main lower-body lift." },
      { dayLabel: "Legs", section: "Accessories", exerciseSlug: "leg-press", sets: "3", reps: "10-12", restSeconds: 90, notes: "Controlled depth." },
      { dayLabel: "Shoulders", section: "Primary work", exerciseSlug: "barbell-shoulder-press", sets: "4", reps: "6-8", restSeconds: 120, notes: "Drive straight up and stay braced." },
      { dayLabel: "Shoulders", section: "Accessories", exerciseSlug: "side-lateral-raise", sets: "3", reps: "12-15", restSeconds: 45, notes: "Stay strict." },
      { dayLabel: "Arms", section: "Primary work", exerciseSlug: "ez-bar-curl", sets: "3", reps: "8-10", restSeconds: 45, notes: "Use a steady tempo." },
      { dayLabel: "Arms", section: "Primary work", exerciseSlug: "reverse-grip-triceps-pushdown", sets: "3", reps: "10-12", restSeconds: 45, notes: "Chase full elbow extension." },
    ],
  }),
  templateSeed({
    name: "Chest and Triceps Workout",
    slug: "chest-and-triceps-workout",
    goal: "muscle-building",
    difficulty: "intermediate",
    estimatedDurationMinutes: 60,
    equipment: ["barbell", "dumbbell", "cable"],
    overview: "A chest-focused session with enough triceps work to support pressing strength and arm size.",
    whoItIsFor: "Lifters who want to bias chest volume without turning the workout into random burnout work.",
    warmupGuidance: "Open the shoulders and upper back first, then use 2 to 3 ramp-up sets on the first bench pattern.",
    progressionGuidance: "Improve the first press over time, then use the cable and triceps work to build extra volume.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 5,
    targetMuscleGroups: ["chest", "arms"],
    days: [
      { dayLabel: "Chest and Triceps", section: "Chest", exerciseSlug: "barbell-bench-press-medium-grip", sets: "4", reps: "5-8", restSeconds: 150, notes: "Lead the day with your most stable press." },
      { dayLabel: "Chest and Triceps", section: "Chest", exerciseSlug: "barbell-incline-bench-press-medium-grip", sets: "3", reps: "6-10", restSeconds: 120, notes: "Slight incline and smooth reps." },
      { dayLabel: "Chest and Triceps", section: "Chest", exerciseSlug: "flat-bench-cable-flyes", sets: "3", reps: "12-15", restSeconds: 45, notes: "Stretch under control." },
      { dayLabel: "Chest and Triceps", section: "Triceps", exerciseSlug: "close-grip-barbell-bench-press", sets: "3", reps: "6-8", restSeconds: 120, notes: "Use a strong setup and tuck the elbows." },
      { dayLabel: "Chest and Triceps", section: "Triceps", exerciseSlug: "reverse-grip-triceps-pushdown", sets: "3", reps: "10-12", restSeconds: 45, notes: "Finish every rep fully." },
      { dayLabel: "Chest and Triceps", section: "Triceps", exerciseSlug: "cable-rope-overhead-triceps-extension", sets: "2-3", reps: "12-15", restSeconds: 45, notes: "Let the long head stretch comfortably." },
    ],
  }),
  templateSeed({
    name: "Back and Biceps Workout",
    slug: "back-and-biceps-workout",
    goal: "muscle-building",
    difficulty: "intermediate",
    estimatedDurationMinutes: 60,
    equipment: ["barbell", "cable", "dumbbell"],
    overview: "A straightforward back and biceps workout with vertical pulls, rows, and direct arm work.",
    whoItIsFor: "Lifters who want a dedicated pull session with a little more direct biceps volume.",
    warmupGuidance: "Use easy rows and shoulder circles before you start ramping into the first heavy pull.",
    progressionGuidance: "Keep the first row or pulldown movement stable long enough to actually see strength move.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 5,
    targetMuscleGroups: ["back", "arms"],
    days: [
      { dayLabel: "Back and Biceps", section: "Back", exerciseSlug: "bent-over-barbell-row", sets: "4", reps: "6-8", restSeconds: 150, notes: "Lead with the elbows and stay braced." },
      { dayLabel: "Back and Biceps", section: "Back", exerciseSlug: "wide-grip-lat-pulldown", sets: "3-4", reps: "8-10", restSeconds: 90, notes: "Avoid jerking the weight." },
      { dayLabel: "Back and Biceps", section: "Back", exerciseSlug: "seated-cable-rows", sets: "3", reps: "8-12", restSeconds: 90, notes: "Own the squeeze." },
      { dayLabel: "Back and Biceps", section: "Back", exerciseSlug: "straight-arm-pulldown", sets: "3", reps: "12-15", restSeconds: 45, notes: "Let the lats finish the rep." },
      { dayLabel: "Back and Biceps", section: "Biceps", exerciseSlug: "barbell-curl", sets: "3", reps: "8-10", restSeconds: 60, notes: "Keep the torso quiet." },
      { dayLabel: "Back and Biceps", section: "Biceps", exerciseSlug: "alternate-hammer-curl", sets: "3", reps: "10-12", restSeconds: 45, notes: "Control the lowering phase." },
    ],
  }),
  templateSeed({
    name: "Shoulder Workout",
    slug: "shoulder-workout",
    goal: "muscle-building",
    difficulty: "intermediate",
    estimatedDurationMinutes: 55,
    equipment: ["barbell", "dumbbell", "cable"],
    overview: "A shoulder session built around pressing and higher-rep delt work.",
    whoItIsFor: "Lifters who want more direct shoulder work without adding too much unnecessary complexity.",
    warmupGuidance: "Warm up the rotator cuff, upper back, and thoracic spine before the main press.",
    progressionGuidance: "Push the main press over time and keep the lateral and rear-delt work strict.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 5,
    targetMuscleGroups: ["shoulders", "arms"],
    days: [
      { dayLabel: "Shoulders", section: "Presses", exerciseSlug: "barbell-shoulder-press", sets: "4", reps: "5-8", restSeconds: 150, notes: "Brace hard and press in a straight line." },
      { dayLabel: "Shoulders", section: "Presses", exerciseSlug: "arnold-dumbbell-press", sets: "3", reps: "8-10", restSeconds: 90, notes: "Use a weight you can control through the full path." },
      { dayLabel: "Shoulders", section: "Side delts", exerciseSlug: "side-lateral-raise", sets: "4", reps: "12-15", restSeconds: 45, notes: "Keep tension on the delts, not momentum." },
      { dayLabel: "Shoulders", section: "Rear delts", exerciseSlug: "bent-over-dumbbell-rear-delt-raise-with-head-on-bench", sets: "3", reps: "12-15", restSeconds: 45, notes: "Keep the neck relaxed and move from the shoulders." },
      { dayLabel: "Shoulders", section: "Upper traps", exerciseSlug: "barbell-shrug", sets: "3", reps: "10-12", restSeconds: 60, notes: "Lift straight up and pause briefly." },
    ],
  }),
  templateSeed({
    name: "Arm Workout",
    slug: "arm-workout",
    goal: "muscle-building",
    difficulty: "intermediate",
    estimatedDurationMinutes: 45,
    equipment: ["ez-bar", "dumbbell", "cable", "bodyweight"],
    overview: "A focused arm session with direct biceps and triceps volume you can recover from.",
    whoItIsFor: "Lifters who want a shorter accessory-focused session to bring up the arms.",
    warmupGuidance: "Warm up elbows and shoulders with a couple of very light cable or dumbbell sets.",
    progressionGuidance: "Progress slowly and stay honest with form so the target muscles keep doing the work.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 5,
    targetMuscleGroups: ["arms"],
    days: [
      { dayLabel: "Arms", section: "Biceps", exerciseSlug: "close-grip-ez-bar-curl", sets: "3", reps: "8-10", restSeconds: 60, notes: "Stay strict and keep the elbows pinned." },
      { dayLabel: "Arms", section: "Biceps", exerciseSlug: "alternate-hammer-curl", sets: "3", reps: "10-12", restSeconds: 45, notes: "Move one arm at a time with full control." },
      { dayLabel: "Arms", section: "Biceps", exerciseSlug: "concentration-curls", sets: "2-3", reps: "10-12", restSeconds: 45, notes: "Squeeze hard at the top." },
      { dayLabel: "Arms", section: "Triceps", exerciseSlug: "reverse-grip-triceps-pushdown", sets: "3", reps: "10-12", restSeconds: 45, notes: "Keep the upper arm from drifting." },
      { dayLabel: "Arms", section: "Triceps", exerciseSlug: "cable-rope-overhead-triceps-extension", sets: "3", reps: "12-15", restSeconds: 45, notes: "Use a full stretch that still feels stable." },
      { dayLabel: "Arms", section: "Triceps", exerciseSlug: "dips-triceps-version", sets: "2-3", reps: "6-10", restSeconds: 75, notes: "Stay upright to bias the triceps." },
    ],
  }),
  templateSeed({
    name: "Glute Workout",
    slug: "glute-workout",
    goal: "muscle-building",
    difficulty: "intermediate",
    estimatedDurationMinutes: 55,
    equipment: ["barbell", "dumbbell", "machine"],
    overview: "A glute-focused lower-body session that still keeps the rest of the lower body working.",
    whoItIsFor: "Someone who wants more direct glute emphasis without abandoning overall leg strength.",
    warmupGuidance: "Do a few glute bridges and bodyweight hinges before you start adding load.",
    progressionGuidance: "Drive the hip-dominant lifts first, then use the single-leg work and accessories for extra volume.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 4,
    targetMuscleGroups: ["glutes", "legs"],
    days: [
      { dayLabel: "Glutes", section: "Primary work", exerciseSlug: "barbell-hip-thrust", sets: "4", reps: "6-10", restSeconds: 120, notes: "Pause hard at the top and avoid overextending the back." },
      { dayLabel: "Glutes", section: "Primary work", exerciseSlug: "romanian-deadlift", sets: "3", reps: "8-10", restSeconds: 120, notes: "Feel the stretch through the glutes and hamstrings." },
      { dayLabel: "Glutes", section: "Single-leg", exerciseSlug: "barbell-walking-lunge", sets: "3", reps: "8-10 each side", restSeconds: 75, notes: "Take long, controlled steps." },
      { dayLabel: "Glutes", section: "Accessories", exerciseSlug: "leg-press", sets: "3", reps: "10-12", restSeconds: 90, notes: "Use a foot position that lets the hips stay comfortable." },
      { dayLabel: "Glutes", section: "Accessories", exerciseSlug: "pull-through", sets: "3", reps: "12-15", restSeconds: 45, notes: "Finish with glutes, not your low back." },
    ],
  }),
  templateSeed({
    name: "Core Workout",
    slug: "core-workout",
    goal: "muscle-building",
    difficulty: "beginner",
    estimatedDurationMinutes: 30,
    equipment: ["bodyweight", "cable", "other"],
    overview: "A direct core session built around control, trunk stiffness, and consistent tension.",
    whoItIsFor: "Anyone who wants a simple core-focused add-on without turning it into endless random ab work.",
    warmupGuidance: "Take a minute to breathe and brace before you start the first set.",
    progressionGuidance: "Progress by owning longer holds or cleaner reps before you chase harder variations.",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 2,
    targetMuscleGroups: ["core"],
    days: [
      { dayLabel: "Core", section: "Main work", exerciseSlug: "ab-roller", sets: "3", reps: "6-10", restSeconds: 60, notes: "Only roll as far as you can while keeping the trunk braced." },
      { dayLabel: "Core", section: "Main work", exerciseSlug: "ab-crunch-machine", sets: "3", reps: "12-15", restSeconds: 45, notes: "Think about curling the ribs toward the pelvis." },
      { dayLabel: "Core", section: "Main work", exerciseSlug: "cable-crunch", sets: "3", reps: "10-15", restSeconds: 45, notes: "Move the torso, not just the arms." },
      { dayLabel: "Core", section: "Accessories", exerciseSlug: "hanging-leg-raise", sets: "3", reps: "8-12", restSeconds: 60, notes: "Control the swing and use the abs to lift." },
      { dayLabel: "Core", section: "Accessories", exerciseSlug: "plank", sets: "3", reps: "30-45 sec", restSeconds: 30, notes: "Stay long through the body and keep the glutes tight." },
    ],
  }),
  templateSeed({
    name: "30-Minute Fat Loss Workout",
    slug: "30-minute-fat-loss-workout",
    goal: "weight-loss",
    difficulty: "beginner",
    estimatedDurationMinutes: 30,
    equipment: ["dumbbell", "bodyweight"],
    overview: "A shorter full-body session designed to keep you moving and make consistency easier on busy days.",
    whoItIsFor: "Someone who wants a time-efficient workout instead of skipping the session altogether.",
    warmupGuidance: "Walk for a few minutes, then do one lighter round before the work sets start.",
    progressionGuidance: "Add reps or reduce rest before you add much more load.",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "core"],
    days: [
      { dayLabel: "Circuit", section: "Circuit A", exerciseSlug: "goblet-squat", sets: "3", reps: "10-12", restSeconds: 30, notes: "Keep the pace honest but controlled." },
      { dayLabel: "Circuit", section: "Circuit A", exerciseSlug: "push-ups", sets: "3", reps: "6-12", restSeconds: 30, notes: "Elevate hands if needed to stay in range." },
      { dayLabel: "Circuit", section: "Circuit A", exerciseSlug: "bent-over-two-dumbbell-row", sets: "3", reps: "10-12", restSeconds: 30, notes: "Pause briefly at the top." },
      { dayLabel: "Circuit", section: "Circuit B", exerciseSlug: "bodyweight-walking-lunge", sets: "3", reps: "10 each side", restSeconds: 30, notes: "Keep every rep balanced." },
      { dayLabel: "Circuit", section: "Circuit B", exerciseSlug: "mountain-climbers", sets: "3", reps: "20-30 sec", restSeconds: 30, notes: "Stay braced instead of bouncing around." },
      { dayLabel: "Circuit", section: "Core", exerciseSlug: "3-4-sit-up", sets: "2-3", reps: "12-15", restSeconds: 30, notes: "Use a steady pace." },
    ],
  }),
  templateSeed({
    name: "Walking and Strength Workout",
    slug: "walking-and-strength-workout",
    goal: "weight-loss",
    difficulty: "beginner",
    estimatedDurationMinutes: 45,
    equipment: ["dumbbell", "bodyweight", "other"],
    overview: "A lighter strength day built to pair well with a daily walking routine.",
    whoItIsFor: "Someone using walking as their main activity base and lifting to keep strength moving forward.",
    warmupGuidance: "Use a few minutes of easy walking before the first strength exercise, then save the rest of the walk for the end.",
    progressionGuidance: "Improve the strength work slowly and increase walking time only when recovery still feels good.",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "core"],
    days: [
      { dayLabel: "Strength block", section: "Main work", exerciseSlug: "goblet-squat", sets: "3", reps: "10-12", restSeconds: 60, notes: "Use a load you can control cleanly." },
      { dayLabel: "Strength block", section: "Main work", exerciseSlug: "dumbbell-bench-press", sets: "3", reps: "8-10", restSeconds: 75, notes: "Stay planted and stable." },
      { dayLabel: "Strength block", section: "Main work", exerciseSlug: "bent-over-two-dumbbell-row", sets: "3", reps: "10-12", restSeconds: 60, notes: "Keep the torso angle consistent." },
      { dayLabel: "Strength block", section: "Accessories", exerciseSlug: "bodyweight-walking-lunge", sets: "2-3", reps: "10 each side", restSeconds: 45, notes: "Control each step." },
      { dayLabel: "Strength block", section: "Core", exerciseSlug: "plank", sets: "3", reps: "20-40 sec", restSeconds: 30, notes: "Brace hard for each hold." },
    ],
  }),
  templateSeed({
    name: "Low-Impact Workout",
    slug: "low-impact-workout",
    goal: "beginner",
    difficulty: "beginner",
    estimatedDurationMinutes: 35,
    equipment: ["bodyweight", "dumbbell", "machine"],
    overview: "A gentle full-body workout that stays lower impact while still training the main muscle groups.",
    whoItIsFor: "Someone easing back into training, managing joint irritation, or wanting a lower-impact option.",
    warmupGuidance: "Move through a gentle range of motion and keep the first set of each move very easy.",
    progressionGuidance: "Add reps or another round first. Do not rush to turn a low-impact session into a max-effort one.",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "core"],
    days: [
      { dayLabel: "Main Session", section: "Main work", exerciseSlug: "chair-squat", sets: "3", reps: "10-15", restSeconds: 45, notes: "Use the chair as a target and stay smooth." },
      { dayLabel: "Main Session", section: "Main work", exerciseSlug: "dumbbell-bench-press", sets: "3", reps: "8-10", restSeconds: 60, notes: "Use a light, controlled load." },
      { dayLabel: "Main Session", section: "Main work", exerciseSlug: "seated-cable-rows", sets: "3", reps: "10-12", restSeconds: 60, notes: "Sit tall and avoid jerking the handle." },
      { dayLabel: "Main Session", section: "Accessories", exerciseSlug: "dumbbell-step-ups", sets: "2-3", reps: "8-10 each side", restSeconds: 60, notes: "Use a low step and stay balanced." },
      { dayLabel: "Main Session", section: "Core", exerciseSlug: "3-4-sit-up", sets: "2-3", reps: "10-12", restSeconds: 30, notes: "Keep the movement controlled." },
    ],
  }),
  templateSeed({
    name: "Hotel Gym Workout",
    slug: "hotel-gym-workout",
    goal: "beginner",
    difficulty: "beginner",
    estimatedDurationMinutes: 40,
    equipment: ["dumbbell", "bodyweight"],
    overview: "A simple travel workout built around the dumbbells and bench you can usually find in a hotel gym.",
    whoItIsFor: "Someone traveling who wants to keep the training habit alive without chasing a perfect setup.",
    warmupGuidance: "Use a few minutes of walking and one easy set of each first movement.",
    progressionGuidance: "Keep the goal simple: do the work well and stay consistent while traveling.",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders", "core"],
    days: [
      { dayLabel: "Hotel Session", section: "Main work", exerciseSlug: "dumbbell-squat", sets: "3", reps: "10-12", restSeconds: 60, notes: "Use the best load the hotel gym has available." },
      { dayLabel: "Hotel Session", section: "Main work", exerciseSlug: "dumbbell-bench-press", sets: "3", reps: "8-12", restSeconds: 75, notes: "Keep the rep quality high." },
      { dayLabel: "Hotel Session", section: "Main work", exerciseSlug: "bent-over-two-dumbbell-row", sets: "3", reps: "10-12", restSeconds: 60, notes: "Stay braced and row evenly." },
      { dayLabel: "Hotel Session", section: "Accessories", exerciseSlug: "dumbbell-shoulder-press", sets: "2-3", reps: "10-12", restSeconds: 60, notes: "Use a controlled press." },
      { dayLabel: "Hotel Session", section: "Accessories", exerciseSlug: "dumbbell-lunges", sets: "2-3", reps: "8-10 each side", restSeconds: 45, notes: "Keep every step balanced." },
      { dayLabel: "Hotel Session", section: "Core", exerciseSlug: "plank", sets: "2-3", reps: "20-40 sec", restSeconds: 30, notes: "Brace and breathe." },
    ],
  }),
  templateSeed({
    name: "Busy Schedule 3-Day Workout",
    slug: "busy-schedule-3-day-workout",
    goal: "beginner",
    difficulty: "beginner",
    estimatedDurationMinutes: 40,
    equipment: ["barbell", "dumbbell", "bodyweight"],
    overview: "A three-day plan for people who need productive sessions without long training windows.",
    whoItIsFor: "A busy adult who wants to stay consistent with three manageable lifting days each week.",
    warmupGuidance: "Keep warm-ups short but intentional with a few easy ramp-up sets for the first lift.",
    progressionGuidance: "If life gets hectic, focus on the first three movements and consider the rest a bonus.",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders"],
    days: [
      { dayLabel: "Day 1", section: "Main work", exerciseSlug: "goblet-squat", sets: "3", reps: "8-10", restSeconds: 75, notes: "Start the week with a lower-body anchor." },
      { dayLabel: "Day 1", section: "Main work", exerciseSlug: "dumbbell-bench-press", sets: "3", reps: "8-10", restSeconds: 75, notes: "Keep the bench press simple and repeatable." },
      { dayLabel: "Day 2", section: "Main work", exerciseSlug: "romanian-deadlift", sets: "3", reps: "8-10", restSeconds: 90, notes: "Train the hinge with control." },
      { dayLabel: "Day 2", section: "Main work", exerciseSlug: "bent-over-two-dumbbell-row", sets: "3", reps: "10-12", restSeconds: 60, notes: "Focus on consistent range." },
      { dayLabel: "Day 3", section: "Main work", exerciseSlug: "bodyweight-walking-lunge", sets: "3", reps: "10 each side", restSeconds: 45, notes: "A short session can still be productive." },
      { dayLabel: "Day 3", section: "Main work", exerciseSlug: "dumbbell-shoulder-press", sets: "3", reps: "8-10", restSeconds: 60, notes: "Finish the week with a stable upper-body push." },
    ],
  }),
  templateSeed({
    name: "Beginner Strength Program",
    slug: "beginner-strength-program",
    goal: "strength",
    difficulty: "beginner",
    estimatedDurationMinutes: 60,
    equipment: ["barbell", "bodyweight"],
    overview: "A simple strength-first plan that keeps the exercise menu small enough to progress consistently.",
    whoItIsFor: "Someone who wants to learn barbell basics and make steady progress on the main lifts.",
    warmupGuidance: "Use multiple small jumps in load and keep the warm-up reps crisp before your work sets begin.",
    progressionGuidance: "Add small amounts of weight only when the prescribed reps are still clean and repeatable.",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders"],
    days: [
      { dayLabel: "Day A", section: "Primary lifts", exerciseSlug: "barbell-squat", sets: "3", reps: "5", restSeconds: 180, notes: "Keep these working sets strong but submaximal." },
      { dayLabel: "Day A", section: "Primary lifts", exerciseSlug: "barbell-bench-press-medium-grip", sets: "3", reps: "5", restSeconds: 180, notes: "Use a consistent setup and pause lightly if needed." },
      { dayLabel: "Day A", section: "Assistance", exerciseSlug: "bent-over-barbell-row", sets: "3", reps: "6-8", restSeconds: 120, notes: "Stay braced through every set." },
      { dayLabel: "Day B", section: "Primary lifts", exerciseSlug: "barbell-deadlift", sets: "3", reps: "3-5", restSeconds: 180, notes: "Pull from a stable start and keep technique identical." },
      { dayLabel: "Day B", section: "Primary lifts", exerciseSlug: "barbell-shoulder-press", sets: "3", reps: "5", restSeconds: 150, notes: "Press from a tight midline." },
      { dayLabel: "Day B", section: "Assistance", exerciseSlug: "wide-grip-lat-pulldown", sets: "3", reps: "8-10", restSeconds: 75, notes: "Use a full range and control the return." },
    ],
  }),
  templateSeed({
    name: "Powerlifting Beginner Program",
    slug: "powerlifting-beginner-program",
    goal: "strength",
    difficulty: "beginner",
    estimatedDurationMinutes: 70,
    equipment: ["barbell", "bodyweight"],
    overview: "A beginner-friendly powerlifting structure built around the squat, bench press, and deadlift.",
    whoItIsFor: "Someone interested in strength sports who wants a clear first step without overly advanced programming.",
    warmupGuidance: "Treat the first three compound lifts seriously and take enough warm-up sets to feel sharp before work sets.",
    progressionGuidance: "Think long term. Small jumps and clean technique matter more than testing maxes too early.",
    experienceLevel: "beginner",
    trainingDaysPerWeek: 3,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders"],
    days: [
      { dayLabel: "Day 1", section: "Competition lifts", exerciseSlug: "barbell-squat", sets: "4", reps: "4-6", restSeconds: 180, notes: "Main squat practice day." },
      { dayLabel: "Day 1", section: "Competition lifts", exerciseSlug: "bench-press-powerlifting", sets: "4", reps: "4-6", restSeconds: 180, notes: "Use a meet-style setup." },
      { dayLabel: "Day 2", section: "Competition lifts", exerciseSlug: "barbell-deadlift", sets: "4", reps: "3-5", restSeconds: 180, notes: "Prioritize clean start positions." },
      { dayLabel: "Day 2", section: "Support work", exerciseSlug: "barbell-shoulder-press", sets: "3", reps: "5-6", restSeconds: 120, notes: "Build pressing strength without overcomplicating it." },
      { dayLabel: "Day 3", section: "Competition lifts", exerciseSlug: "bench-press-powerlifting", sets: "4", reps: "5-6", restSeconds: 150, notes: "Slightly higher bench volume day." },
      { dayLabel: "Day 3", section: "Support work", exerciseSlug: "bent-over-barbell-row", sets: "3", reps: "6-8", restSeconds: 120, notes: "Back strength still matters for the total." },
    ],
  }),
  templateSeed({
    name: "Squat-Focused Workout",
    slug: "squat-focused-workout",
    goal: "strength",
    difficulty: "intermediate",
    estimatedDurationMinutes: 65,
    equipment: ["barbell", "machine"],
    overview: "A lower-body workout that biases squat strength while still supporting long-term lower-body development.",
    whoItIsFor: "Someone who wants extra squat practice without turning the whole week into pure fatigue.",
    warmupGuidance: "Spend time opening the ankles and hips, then ramp up to your work sets gradually.",
    progressionGuidance: "Keep the first squat pattern as the main driver and let the rest of the day support it.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 4,
    targetMuscleGroups: ["legs", "glutes"],
    days: [
      { dayLabel: "Squat Focus", section: "Primary lifts", exerciseSlug: "barbell-squat", sets: "5", reps: "3-5", restSeconds: 180, notes: "Main strength focus for the day." },
      { dayLabel: "Squat Focus", section: "Primary lifts", exerciseSlug: "front-barbell-squat", sets: "3", reps: "4-6", restSeconds: 150, notes: "Keep the torso tall and clean." },
      { dayLabel: "Squat Focus", section: "Secondary work", exerciseSlug: "leg-press", sets: "3", reps: "8-12", restSeconds: 90, notes: "Drive hard but stay controlled." },
      { dayLabel: "Squat Focus", section: "Secondary work", exerciseSlug: "romanian-deadlift", sets: "3", reps: "6-8", restSeconds: 120, notes: "Balance the day with posterior-chain work." },
      { dayLabel: "Squat Focus", section: "Accessories", exerciseSlug: "leg-extensions", sets: "3", reps: "12-15", restSeconds: 60, notes: "Finish with controlled quad volume." },
    ],
  }),
  templateSeed({
    name: "Bench Press-Focused Workout",
    slug: "bench-press-focused-workout",
    goal: "strength",
    difficulty: "intermediate",
    estimatedDurationMinutes: 60,
    equipment: ["barbell", "cable", "dumbbell"],
    overview: "An upper-body session designed to put the bench press first while still keeping shoulders and triceps moving forward.",
    whoItIsFor: "Someone trying to improve bench strength without losing chest and triceps size work.",
    warmupGuidance: "Use upper-back activation and several bench ramp-up sets before the work sets begin.",
    progressionGuidance: "Keep the first bench pattern consistent long enough to measure actual progress instead of hopping around.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 4,
    targetMuscleGroups: ["chest", "arms", "shoulders"],
    days: [
      { dayLabel: "Bench Focus", section: "Primary lifts", exerciseSlug: "bench-press-powerlifting", sets: "5", reps: "3-5", restSeconds: 180, notes: "Use your strongest repeatable competition-style setup." },
      { dayLabel: "Bench Focus", section: "Primary lifts", exerciseSlug: "close-grip-barbell-bench-press", sets: "3", reps: "5-6", restSeconds: 150, notes: "Secondary strength builder for triceps." },
      { dayLabel: "Bench Focus", section: "Secondary work", exerciseSlug: "barbell-incline-bench-press-medium-grip", sets: "3", reps: "6-8", restSeconds: 120, notes: "Build the upper chest and shoulders." },
      { dayLabel: "Bench Focus", section: "Secondary work", exerciseSlug: "flat-bench-cable-flyes", sets: "3", reps: "12-15", restSeconds: 45, notes: "Keep the chest working through the whole range." },
      { dayLabel: "Bench Focus", section: "Accessories", exerciseSlug: "reverse-grip-triceps-pushdown", sets: "3", reps: "10-12", restSeconds: 45, notes: "Finish with direct triceps work." },
    ],
  }),
  templateSeed({
    name: "Deadlift-Focused Workout",
    slug: "deadlift-focused-workout",
    goal: "strength",
    difficulty: "intermediate",
    estimatedDurationMinutes: 65,
    equipment: ["barbell", "cable", "machine"],
    overview: "A posterior-chain-heavy day built to support better deadlift performance without overcomplicating the session.",
    whoItIsFor: "Someone who wants extra deadlift attention while keeping the back and hamstrings strong enough to support it.",
    warmupGuidance: "Warm up the hinge pattern gradually and avoid jumping straight to heavy pulls cold.",
    progressionGuidance: "Let the deadlift lead the day and keep the accessory work heavy enough to matter but clean enough to recover from.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 4,
    targetMuscleGroups: ["back", "legs", "glutes"],
    days: [
      { dayLabel: "Deadlift Focus", section: "Primary lifts", exerciseSlug: "barbell-deadlift", sets: "5", reps: "3-5", restSeconds: 180, notes: "Treat the first pull of every set like a single." },
      { dayLabel: "Deadlift Focus", section: "Primary lifts", exerciseSlug: "romanian-deadlift", sets: "3", reps: "6-8", restSeconds: 150, notes: "Use this for tension and position, not sloppy fatigue." },
      { dayLabel: "Deadlift Focus", section: "Secondary work", exerciseSlug: "bent-over-barbell-row", sets: "3", reps: "6-8", restSeconds: 120, notes: "Build the upper-back support system." },
      { dayLabel: "Deadlift Focus", section: "Secondary work", exerciseSlug: "wide-grip-lat-pulldown", sets: "3", reps: "8-10", restSeconds: 75, notes: "Train the lats through a full range." },
      { dayLabel: "Deadlift Focus", section: "Accessories", exerciseSlug: "back-extensions-hyperextensions", sets: "3", reps: "10-15", restSeconds: 60, notes: "Use bodyweight or a small plate to finish." },
    ],
  }),
  templateSeed({
    name: "Strength and Hypertrophy Workout",
    slug: "strength-and-hypertrophy-workout",
    goal: "strength",
    difficulty: "intermediate",
    estimatedDurationMinutes: 65,
    equipment: ["barbell", "dumbbell", "cable", "machine"],
    overview: "A mixed approach that pairs lower-rep compound work with higher-rep accessories in the same week.",
    whoItIsFor: "Someone who wants to keep getting stronger while still training for size and shape.",
    warmupGuidance: "Warm up the first compound thoroughly, then keep the accessory warm-up shorter and simpler.",
    progressionGuidance: "Use load progression on the first lift of each day and rep progression on the rest of the session.",
    experienceLevel: "intermediate",
    trainingDaysPerWeek: 4,
    targetMuscleGroups: ["legs", "chest", "back", "shoulders", "arms"],
    days: [
      { dayLabel: "Upper", section: "Strength work", exerciseSlug: "barbell-bench-press-medium-grip", sets: "4", reps: "4-6", restSeconds: 150, notes: "Strength emphasis starts here." },
      { dayLabel: "Upper", section: "Strength work", exerciseSlug: "bent-over-barbell-row", sets: "4", reps: "5-6", restSeconds: 150, notes: "Pair heavy upper-body pulling with the press." },
      { dayLabel: "Upper", section: "Hypertrophy work", exerciseSlug: "side-lateral-raise", sets: "3", reps: "12-15", restSeconds: 45, notes: "Controlled delt volume." },
      { dayLabel: "Lower", section: "Strength work", exerciseSlug: "barbell-squat", sets: "4", reps: "4-6", restSeconds: 180, notes: "Use this as the main lower-body strength anchor." },
      { dayLabel: "Lower", section: "Strength work", exerciseSlug: "barbell-deadlift", sets: "3", reps: "3-5", restSeconds: 180, notes: "Heavy pulls with clean technique." },
      { dayLabel: "Lower", section: "Hypertrophy work", exerciseSlug: "leg-press", sets: "3", reps: "10-12", restSeconds: 90, notes: "Add muscular volume without chasing sloppy reps." },
    ],
  }),
];

function findExercise(sourceBySlug, rawExercises, candidates) {
  function compact(value) {
    return slugify(value).replaceAll("-", "");
  }

  function scoreCandidate(candidate, exercise) {
    const candidateSlug = slugify(candidate);
    const exerciseSlug = slugify(exercise.name);

    if (exerciseSlug === candidateSlug) {
      return 10_000;
    }

    if (compact(exerciseSlug) === compact(candidateSlug)) {
      return 9_000;
    }

    const tokens = candidateSlug.split("-").filter(Boolean);
    const matchCount = tokens.filter((token) => exerciseSlug.includes(token) || compact(exerciseSlug).includes(token)).length;

    if (matchCount === tokens.length && matchCount > 0) {
      return 5_000 - Math.abs(exerciseSlug.length - candidateSlug.length);
    }

    return 0;
  }

  for (const candidate of candidates) {
    const candidateSlug = slugify(candidate);
    const exact = sourceBySlug.get(candidateSlug);
    if (exact) {
      return exact;
    }
  }

  for (const candidate of candidates) {
    const scored = rawExercises
      .map((exercise) => ({
        exercise,
        score: scoreCandidate(candidate, exercise),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.exercise.name.localeCompare(right.exercise.name));

    if (scored[0]?.exercise) {
      return scored[0].exercise;
    }
  }

  throw new Error(`Unable to resolve exercise reference from candidates: ${candidates.join(", ")}`);
}

function collectRequiredExerciseSlugs(rawExercises) {
  const sourceBySlug = new Map(rawExercises.map((exercise) => [slugify(exercise.name), exercise]));
  const required = new Set();

  for (const template of WORKOUT_TEMPLATES) {
    for (const day of template.days) {
      const exercise = findExercise(sourceBySlug, rawExercises, [day.exerciseSlug]);
      required.add(slugify(exercise.name));
      day.exerciseSlug = slugify(exercise.name);
    }
  }

  return required;
}

function buildExerciseSelection(rawExercises) {
  const requiredSlugs = collectRequiredExerciseSlugs(rawExercises);
  const sourceBySlug = new Map(rawExercises.map((exercise) => [slugify(exercise.name), exercise]));
  const selected = [];
  const seen = new Set();

  for (const slug of requiredSlugs) {
    const exercise = sourceBySlug.get(slug);
    if (!exercise) {
      throw new Error(`Required exercise ${slug} was not found in the source dataset.`);
    }

    selected.push(buildExerciseRecord(exercise));
    seen.add(slug);
  }

  const ranked = rawExercises
    .map(buildExerciseRecord)
    .filter((record) => !seen.has(record.slug))
    .sort((left, right) => scoreExercise(right) - scoreExercise(left) || left.name.localeCompare(right.name));

  for (const record of ranked) {
    if (selected.length >= exerciseTargetCount) {
      break;
    }

    selected.push(record);
  }

  return enrichExerciseRelationships(selected);
}

function buildExercisesSeedSql(exercises) {
  const values = exercises
    .map(
      (exercise) => `  (
    ${toSqlText(exercise.name)},
    ${toSqlText(exercise.slug)},
    ${toSqlText(exercise.primaryMuscleGroup)},
    ${toSqlTextArray(exercise.secondaryMuscleGroups)},
    ${toSqlTextArray(exercise.equipment)},
    ${toSqlText(exercise.movementPattern)},
    ${toSqlText(exercise.difficulty)},
    ${toSqlText(exercise.exerciseType)},
    ${toSqlBoolean(exercise.isCompound)},
    ${toSqlTextArray(exercise.instructions)},
    ${toSqlTextArray(exercise.commonMistakes)},
    ${toSqlTextArray(exercise.benefits)},
    ${toSqlTextArray(exercise.alternatives)},
    ${toSqlTextArray(exercise.variations)},
    ${toSqlText(exercise.seoTitle)},
    ${toSqlText(exercise.seoDescription)},
    ${toSqlText(exercise.source)},
    ${toSqlText(exercise.sourceLicense)}
  )`,
    )
    .join(",\n");

  return `begin;

create temp table if not exists seed_exercises (
  name text not null,
  slug text not null,
  primary_muscle_group text,
  secondary_muscle_groups text[] not null,
  equipment text[] not null,
  movement_pattern text,
  difficulty text,
  exercise_type text,
  is_compound boolean not null,
  instructions text[] not null,
  common_mistakes text[] not null,
  benefits text[] not null,
  alternatives text[] not null,
  variations text[] not null,
  seo_title text,
  seo_description text,
  source text,
  source_license text
) on commit drop;

insert into seed_exercises (
  name,
  slug,
  primary_muscle_group,
  secondary_muscle_groups,
  equipment,
  movement_pattern,
  difficulty,
  exercise_type,
  is_compound,
  instructions,
  common_mistakes,
  benefits,
  alternatives,
  variations,
  seo_title,
  seo_description,
  source,
  source_license
)
values
${values};

insert into public.exercises (
  name,
  slug,
  primary_muscle_group,
  secondary_muscle_groups,
  equipment,
  movement_pattern,
  difficulty,
  exercise_type,
  is_compound,
  instructions,
  common_mistakes,
  benefits,
  alternatives,
  variations,
  seo_title,
  seo_description,
  source,
  source_license
)
select
  name,
  slug,
  primary_muscle_group,
  secondary_muscle_groups,
  equipment,
  movement_pattern,
  difficulty,
  exercise_type,
  is_compound,
  instructions,
  common_mistakes,
  benefits,
  alternatives,
  variations,
  seo_title,
  seo_description,
  source,
  source_license
from seed_exercises
on conflict (slug) do update
set
  name = excluded.name,
  primary_muscle_group = excluded.primary_muscle_group,
  secondary_muscle_groups = excluded.secondary_muscle_groups,
  equipment = excluded.equipment,
  movement_pattern = excluded.movement_pattern,
  difficulty = excluded.difficulty,
  exercise_type = excluded.exercise_type,
  is_compound = excluded.is_compound,
  instructions = excluded.instructions,
  common_mistakes = excluded.common_mistakes,
  benefits = excluded.benefits,
  alternatives = excluded.alternatives,
  variations = excluded.variations,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  source = excluded.source,
  source_license = excluded.source_license,
  updated_at = timezone('utc', now());

commit;
`;
}

function buildWorkoutTemplatesSeedSql(templates) {
  const templateValues = templates
    .map(
      (template) => `  (
    ${toSqlText(template.name)},
    ${toSqlText(template.slug)},
    ${toSqlText(template.goal)},
    ${toSqlText(template.difficulty)},
    ${toSqlInteger(template.estimatedDurationMinutes)},
    ${toSqlTextArray(template.equipment)},
    ${toSqlText(template.overview)},
    ${toSqlText(template.whoItIsFor)},
    ${toSqlText(template.warmupGuidance)},
    ${toSqlText(template.progressionGuidance)},
    ${toSqlText(template.experienceLevel)},
    ${toSqlInteger(template.trainingDaysPerWeek)},
    ${toSqlTextArray(template.targetMuscleGroups)},
    ${toSqlText(template.seoTitle)},
    ${toSqlText(template.seoDescription)}
  )`,
    )
    .join(",\n");

  const exerciseRows = templates
    .flatMap((template) =>
      template.days.map(
        (day) => `  (
    ${toSqlText(template.slug)},
    ${toSqlText(day.exerciseSlug)},
    ${toSqlText(day.dayLabel)},
    ${toSqlText(day.section)},
    ${toSqlInteger(day.sortOrder ?? template.days.indexOf(day) + 1)},
    ${toSqlText(day.sets)},
    ${toSqlText(day.reps)},
    ${toSqlInteger(day.restSeconds)},
    ${toSqlText(day.notes)}
  )`,
      ),
    )
    .join(",\n");

  return `begin;

create temp table if not exists seed_workout_templates (
  name text not null,
  slug text not null,
  goal text,
  difficulty text,
  estimated_duration_minutes integer,
  equipment text[] not null,
  overview text,
  who_it_is_for text,
  warmup_guidance text,
  progression_guidance text,
  experience_level text,
  training_days_per_week integer,
  target_muscle_groups text[] not null,
  seo_title text,
  seo_description text
) on commit drop;

insert into seed_workout_templates (
  name,
  slug,
  goal,
  difficulty,
  estimated_duration_minutes,
  equipment,
  overview,
  who_it_is_for,
  warmup_guidance,
  progression_guidance,
  experience_level,
  training_days_per_week,
  target_muscle_groups,
  seo_title,
  seo_description
)
values
${templateValues};

insert into public.workout_templates (
  user_id,
  name,
  slug,
  goal,
  difficulty,
  estimated_duration_minutes,
  equipment,
  overview,
  who_it_is_for,
  warmup_guidance,
  progression_guidance,
  experience_level,
  training_days_per_week,
  target_muscle_groups,
  seo_title,
  seo_description,
  is_public
)
select
  null,
  name,
  slug,
  goal,
  difficulty,
  estimated_duration_minutes,
  equipment,
  overview,
  who_it_is_for,
  warmup_guidance,
  progression_guidance,
  experience_level,
  training_days_per_week,
  target_muscle_groups,
  seo_title,
  seo_description,
  true
from seed_workout_templates
on conflict (slug) do update
set
  user_id = excluded.user_id,
  name = excluded.name,
  goal = excluded.goal,
  difficulty = excluded.difficulty,
  estimated_duration_minutes = excluded.estimated_duration_minutes,
  equipment = excluded.equipment,
  overview = excluded.overview,
  who_it_is_for = excluded.who_it_is_for,
  warmup_guidance = excluded.warmup_guidance,
  progression_guidance = excluded.progression_guidance,
  experience_level = excluded.experience_level,
  training_days_per_week = excluded.training_days_per_week,
  target_muscle_groups = excluded.target_muscle_groups,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  is_public = true,
  updated_at = timezone('utc', now());

delete from public.workout_template_exercises
where template_id in (
  select id
  from public.workout_templates
  where slug in (select slug from seed_workout_templates)
);

create temp table if not exists seed_workout_template_exercises (
  workout_template_slug text not null,
  exercise_slug text not null,
  day_label text,
  section text,
  sort_order integer not null,
  sets text,
  reps text,
  rest_seconds integer,
  notes text
) on commit drop;

insert into seed_workout_template_exercises (
  workout_template_slug,
  exercise_slug,
  day_label,
  section,
  sort_order,
  sets,
  reps,
  rest_seconds,
  notes
)
values
${exerciseRows};

insert into public.workout_template_exercises (
  workout_template_id,
  template_id,
  exercise_id,
  exercise_name,
  day_label,
  section,
  sort_order,
  sets,
  reps,
  rest_seconds,
  notes
)
select
  workout_templates.id,
  workout_templates.id,
  exercises.id,
  exercises.name,
  seed_workout_template_exercises.day_label,
  seed_workout_template_exercises.section,
  seed_workout_template_exercises.sort_order,
  seed_workout_template_exercises.sets,
  seed_workout_template_exercises.reps,
  seed_workout_template_exercises.rest_seconds,
  seed_workout_template_exercises.notes
from seed_workout_template_exercises
join public.workout_templates
  on workout_templates.slug = seed_workout_template_exercises.workout_template_slug
join public.exercises
  on exercises.slug = seed_workout_template_exercises.exercise_slug;

commit;
`;
}

function buildBootstrapSnapshot(exercises, templates) {
  const exerciseIdBySlug = new Map(exercises.map((exercise, index) => [exercise.slug, `seed-exercise-${index + 1}`]));
  const workoutIdBySlug = new Map(templates.map((template, index) => [template.slug, `seed-workout-${index + 1}`]));

  return {
    generatedAt: new Date().toISOString(),
    exercises: exercises.map((exercise) => ({
      id: exerciseIdBySlug.get(exercise.slug),
      name: exercise.name,
      slug: exercise.slug,
      primaryMuscleGroup: exercise.primaryMuscleGroup,
      secondaryMuscleGroups: exercise.secondaryMuscleGroups,
      equipment: exercise.equipment,
      movementPattern: exercise.movementPattern,
      difficulty: exercise.difficulty,
      exerciseType: exercise.exerciseType,
      isCompound: exercise.isCompound,
      instructions: exercise.instructions,
      commonMistakes: exercise.commonMistakes,
      benefits: exercise.benefits,
      alternatives: exercise.alternatives,
      variations: exercise.variations,
      seoTitle: exercise.seoTitle,
      seoDescription: exercise.seoDescription,
      source: exercise.source,
      sourceLicense: exercise.sourceLicense,
      createdAt: null,
      updatedAt: null,
    })),
    workoutTemplates: templates.map((template) => ({
      id: workoutIdBySlug.get(template.slug),
      name: template.name,
      slug: template.slug,
      goal: template.goal,
      difficulty: template.difficulty,
      estimatedDurationMinutes: template.estimatedDurationMinutes,
      equipment: template.equipment,
      overview: template.overview,
      whoItIsFor: template.whoItIsFor,
      warmupGuidance: template.warmupGuidance,
      progressionGuidance: template.progressionGuidance,
      experienceLevel: template.experienceLevel,
      trainingDaysPerWeek: template.trainingDaysPerWeek,
      targetMuscleGroups: template.targetMuscleGroups,
      seoTitle: template.seoTitle,
      seoDescription: template.seoDescription,
      isPublic: true,
      createdAt: null,
      updatedAt: null,
    })),
    workoutTemplateExercises: templates.flatMap((template) =>
      template.days.map((day, index) => {
        const exerciseId = exerciseIdBySlug.get(day.exerciseSlug) ?? null;

        return {
          id: `seed-template-exercise-${template.slug}-${index + 1}`,
          workoutTemplateId: workoutIdBySlug.get(template.slug),
          exerciseId,
          exerciseName: exercises.find((exercise) => exercise.slug === day.exerciseSlug)?.name ?? titleCaseFromSlug(day.exerciseSlug),
          dayLabel: day.dayLabel,
          section: day.section,
          sortOrder: day.sortOrder ?? index + 1,
          sets: day.sets,
          reps: day.reps,
          restSeconds: day.restSeconds,
          notes: day.notes,
          createdAt: null,
        };
      }),
    ),
  };
}

function titleCaseFromSlug(value) {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

async function main() {
  const rawExercises = JSON.parse(await fs.readFile(sourcePath, "utf8"));
  const selectedExercises = buildExerciseSelection(rawExercises);
  const bootstrapSnapshot = buildBootstrapSnapshot(selectedExercises, WORKOUT_TEMPLATES);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(exercisesOutputPath, buildExercisesSeedSql(selectedExercises));
  await fs.writeFile(workoutsOutputPath, buildWorkoutTemplatesSeedSql(WORKOUT_TEMPLATES));
  await fs.writeFile(bootstrapOutputPath, JSON.stringify(bootstrapSnapshot, null, 2));

  console.log(`Generated ${selectedExercises.length} exercise seed rows.`);
  console.log(`Generated ${WORKOUT_TEMPLATES.length} workout templates.`);
}

await main();
