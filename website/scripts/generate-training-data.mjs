import fs from "node:fs/promises";
import path from "node:path";

const projectRef = "yozfzsudbcqjttepjnyg";
const supabaseUrl = process.env.SUPABASE_URL ?? `https://${projectRef}.supabase.co`;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pageSize = 1000;

const generatedDir = path.join(process.cwd(), ".generated");
const generatedDataPath = path.join(generatedDir, "training-data.json");
const bootstrapDataPath = path.join(process.cwd(), "..", "supabase", "seed", "training_bootstrap.json");

const emptySnapshot = {
  generatedAt: null,
  exercises: [],
  workoutTemplates: [],
  workoutTemplateExercises: [],
};

function cleanText(value) {
  return typeof value === "string"
    ? value
        .replaceAll("Â¾", "3/4")
        .replaceAll("Â½", "1/2")
        .replaceAll("Â", "")
        .trim()
    : "";
}

function normalizeText(value) {
  const cleaned = cleanText(value);
  return cleaned ? cleaned : null;
}

function normalizeTextArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(cleanText).filter(Boolean);
}

function normalizeBoolean(value) {
  return value === true;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

const DUPLICATE_EXERCISE_SLUG_SUFFIX_PATTERN = /-[0-9a-f]{8}$/i;

function normalizeExerciseName(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, " ");
}

function slugifyExerciseName(value) {
  return normalizeExerciseName(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeExerciseSlug(value) {
  return cleanText(value).toLowerCase().replace(/-+/g, "-");
}

function getCanonicalExerciseSlug(exercise) {
  const normalizedSlug = normalizeExerciseSlug(exercise.slug);
  const normalizedNameSlug = slugifyExerciseName(exercise.name);
  const strippedSlug = normalizedSlug.replace(DUPLICATE_EXERCISE_SLUG_SUFFIX_PATTERN, "");

  if (normalizedNameSlug && strippedSlug === normalizedNameSlug) {
    return strippedSlug;
  }

  return normalizedSlug;
}

function getNormalizedEquipmentSignature(exercise) {
  return [...new Set((exercise.equipment ?? []).map((item) => cleanText(item).toLowerCase()).filter(Boolean))]
    .sort()
    .join("|");
}

function getExerciseCanonicalIdentityKey(exercise) {
  return [
    getCanonicalExerciseSlug(exercise),
    normalizeExerciseName(exercise.name),
    normalizeText(exercise.primaryMuscleGroup) ?? "",
    normalizeText(exercise.exerciseType) ?? "",
    exercise.isCompound ? "compound" : "isolation",
    getNormalizedEquipmentSignature(exercise),
  ].join("|");
}

function getExerciseContentCompletenessScore(exercise) {
  return (
    exercise.instructions.length * 4
    + exercise.commonMistakes.length * 3
    + exercise.benefits.length * 2
    + exercise.alternatives.length
    + exercise.variations.length
    + (exercise.seoTitle ? 2 : 0)
    + (exercise.seoDescription ? 2 : 0)
    + (exercise.source ? 1 : 0)
  );
}

function parseIsoTimestamp(value) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function compareExerciseRecordPreference(left, right) {
  const leftSlug = normalizeExerciseSlug(left.slug);
  const rightSlug = normalizeExerciseSlug(right.slug);
  const leftCanonicalSlug = getCanonicalExerciseSlug(left);
  const rightCanonicalSlug = getCanonicalExerciseSlug(right);
  const leftCanonicalNameSlug = slugifyExerciseName(left.name);
  const rightCanonicalNameSlug = slugifyExerciseName(right.name);
  const leftHasDuplicateSuffix =
    leftCanonicalSlug !== leftSlug && DUPLICATE_EXERCISE_SLUG_SUFFIX_PATTERN.test(leftSlug);
  const rightHasDuplicateSuffix =
    rightCanonicalSlug !== rightSlug && DUPLICATE_EXERCISE_SLUG_SUFFIX_PATTERN.test(rightSlug);

  if (leftHasDuplicateSuffix !== rightHasDuplicateSuffix) {
    return leftHasDuplicateSuffix ? -1 : 1;
  }

  const leftMatchesCanonicalName = leftCanonicalSlug === leftCanonicalNameSlug;
  const rightMatchesCanonicalName = rightCanonicalSlug === rightCanonicalNameSlug;

  if (leftMatchesCanonicalName !== rightMatchesCanonicalName) {
    return leftMatchesCanonicalName ? 1 : -1;
  }

  const completenessDifference =
    getExerciseContentCompletenessScore(left) - getExerciseContentCompletenessScore(right);

  if (completenessDifference !== 0) {
    return completenessDifference;
  }

  const createdAtDifference = parseIsoTimestamp(right.createdAt) - parseIsoTimestamp(left.createdAt);

  if (createdAtDifference !== 0) {
    return createdAtDifference;
  }

  const updatedAtDifference = parseIsoTimestamp(right.updatedAt) - parseIsoTimestamp(left.updatedAt);

  if (updatedAtDifference !== 0) {
    return updatedAtDifference;
  }

  const slugLengthDifference = right.slug.length - left.slug.length;

  if (slugLengthDifference !== 0) {
    return slugLengthDifference;
  }

  return right.id.localeCompare(left.id);
}

function deduplicateExercises(exercises) {
  const uniqueById = new Map();

  for (const exercise of exercises) {
    const current = uniqueById.get(exercise.id);

    if (!current || compareExerciseRecordPreference(exercise, current) > 0) {
      uniqueById.set(exercise.id, exercise);
    }
  }

  const orderedKeys = [];
  const bestByCanonicalIdentity = new Map();

  for (const exercise of uniqueById.values()) {
    const canonicalKey = getExerciseCanonicalIdentityKey(exercise);
    const current = bestByCanonicalIdentity.get(canonicalKey);

    if (!current) {
      orderedKeys.push(canonicalKey);
      bestByCanonicalIdentity.set(canonicalKey, exercise);
      continue;
    }

    if (compareExerciseRecordPreference(exercise, current) > 0) {
      bestByCanonicalIdentity.set(canonicalKey, exercise);
    }
  }

  return orderedKeys.map((key) => bestByCanonicalIdentity.get(key));
}

function inferBenefitsFromExercise(exercise) {
  const benefits = [`Builds strength and control through the ${exercise.primaryMuscleGroup ?? "full-body"} region.`];

  if (exercise.isCompound) {
    benefits.push("Trains multiple joints at once, which can make your sessions more efficient.");
  } else {
    benefits.push("Makes it easier to focus on one area when you want extra practice or volume.");
  }

  if (exercise.exerciseType === "stretching") {
    benefits.push("Can improve mobility and help you move more comfortably through the target range.");
  } else if (exercise.exerciseType === "cardio") {
    benefits.push("Adds conditioning work that can support general fitness and work capacity.");
  } else {
    benefits.push("Gives you a repeatable way to track progress inside Logbook over time.");
  }

  return benefits;
}

function applyExerciseOverrides(exercise) {
  const normalizedName = exercise.name.toLowerCase();

  const setPrimaryMuscleGroup = (primaryMuscleGroup, secondaryMuscleGroups = exercise.secondaryMuscleGroups) => {
    exercise.primaryMuscleGroup = primaryMuscleGroup;
    exercise.secondaryMuscleGroups = uniqueValues(
      secondaryMuscleGroups.filter((group) => group && group !== primaryMuscleGroup),
    );
  };

  const setMovementPattern = (movementPattern) => {
    exercise.movementPattern = movementPattern;
  };

  const setExerciseType = (exerciseType) => {
    exercise.exerciseType = exerciseType;
  };

  const setCompoundStatus = (isCompound) => {
    exercise.isCompound = isCompound;
  };

  if (/\b(sit[- ]?up|crunch|plank|rollout|leg raise|woodchop)\b/.test(normalizedName)) {
    setPrimaryMuscleGroup("core", exercise.secondaryMuscleGroups);
    setMovementPattern("core");
    exercise.benefits = inferBenefitsFromExercise(exercise);
    return exercise;
  }

  if (/\b(hip thrust|glute bridge|pull through)\b/.test(normalizedName)) {
    setPrimaryMuscleGroup("glutes", ["legs"]);
    setMovementPattern("hinge");
    setExerciseType("strength");
    exercise.benefits = inferBenefitsFromExercise(exercise);
    return exercise;
  }

  if (/\bdeadlift\b/.test(normalizedName)) {
    setPrimaryMuscleGroup("legs", uniqueValues([...exercise.secondaryMuscleGroups, "back", "glutes"]));
    setMovementPattern("hinge");
    setExerciseType("strength");
    exercise.benefits = inferBenefitsFromExercise(exercise);
    return exercise;
  }

  if (/\b(squat|lunge|leg press|leg curls?|leg extension)\b/.test(normalizedName)) {
    setPrimaryMuscleGroup("legs", uniqueValues([...exercise.secondaryMuscleGroups, "glutes"]));
    setExerciseType("strength");
    exercise.benefits = inferBenefitsFromExercise(exercise);
    return exercise;
  }

  if (/\b(bench dips|dips - triceps version|jm press)\b/.test(normalizedName)) {
    setPrimaryMuscleGroup("arms", ["chest", "shoulders"]);
    setMovementPattern("horizontal-push");
    setExerciseType("strength");
    setCompoundStatus(true);
    exercise.benefits = inferBenefitsFromExercise(exercise);
    return exercise;
  }

  if (/\b(bicep curls?|hammer curls?|preacher curls?|concentration curls?|barbell curls?|close-grip ez bar curls?|alternate .*curls?|zottman curls?|drag curls?)\b/.test(normalizedName)) {
    setPrimaryMuscleGroup("arms", []);
    setMovementPattern("elbow-flexion");
    setExerciseType("strength");
    setCompoundStatus(false);
    exercise.benefits = inferBenefitsFromExercise(exercise);
    return exercise;
  }

  if ((/\b(triceps|pushdown|skull crusher|kickback)\b/.test(normalizedName) || normalizedName.includes("triceps extension"))
    && !/\bleg extension\b/.test(normalizedName)) {
    setPrimaryMuscleGroup("arms", []);
    setMovementPattern("elbow-extension");
    setExerciseType("strength");
    setCompoundStatus(false);
    exercise.benefits = inferBenefitsFromExercise(exercise);
    return exercise;
  }

  if (/\b(upright row|rear delt|rear-delt|lateral raise|laterals|shoulder press|shoulder raise|arnold press|face pull|row to neck)\b/.test(normalizedName)) {
    setPrimaryMuscleGroup("shoulders", uniqueValues([...exercise.secondaryMuscleGroups, "arms", "back"]));
    if (/\b(shoulder press|arnold press)\b/.test(normalizedName)) {
      setMovementPattern("vertical-push");
    }
    setExerciseType("strength");
    exercise.benefits = inferBenefitsFromExercise(exercise);
    return exercise;
  }

  if (/\b(pulldown|pull ?up|chin ?up|row)\b/.test(normalizedName)) {
    setPrimaryMuscleGroup("back", uniqueValues([...exercise.secondaryMuscleGroups, "arms"]));
    setMovementPattern("pull");
    setExerciseType("strength");
    exercise.benefits = inferBenefitsFromExercise(exercise);
    return exercise;
  }

  if (normalizedName.includes("close-grip barbell bench press")) {
    setPrimaryMuscleGroup("arms", ["chest", "shoulders"]);
    setMovementPattern("horizontal-push");
    setExerciseType("strength");
    setCompoundStatus(true);
    exercise.benefits = inferBenefitsFromExercise(exercise);
    return exercise;
  }

  if ((/\b(flye?s?|pec deck|butterfly)\b/.test(normalizedName) && !/\breverse\b/.test(normalizedName)) || normalizedName.includes("cable fly")) {
    setPrimaryMuscleGroup("chest", uniqueValues([...exercise.secondaryMuscleGroups, "shoulders", "arms"]));
    setMovementPattern("chest-fly");
    setExerciseType("strength");
    setCompoundStatus(false);
    exercise.secondaryMuscleGroups = [];
    exercise.benefits = inferBenefitsFromExercise(exercise);
    return exercise;
  }

  if (/\b(bench press|floor press|board press|pin press|chest press|pushups?|guillotine bench|chest dip)\b/.test(normalizedName)
    || /\bclose-grip dumbbell press\b/.test(normalizedName)) {
    setPrimaryMuscleGroup("chest", ["shoulders", "arms"]);
    setMovementPattern("horizontal-push");
    setExerciseType("strength");
    setCompoundStatus(true);
    exercise.benefits = inferBenefitsFromExercise(exercise);
    return exercise;
  }

  exercise.benefits = inferBenefitsFromExercise(exercise);
  return exercise;
}

function normalizeNumber(value) {
  if (typeof value === "number") {
    return value;
  }

  if (value == null || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

const LOW_QUALITY_SUBSTITUTION_PATTERN =
  /\b(with chains|with bands|reverse band|guillotine|behind the head|behind the neck|palms-down|palms-up|plate movers)\b/i;

const EXERCISE_RELATIONSHIP_OVERRIDES = {
  "bench-press-powerlifting": {
    alternatives: ["Barbell Bench Press - Medium Grip", "Dumbbell Bench Press", "Cable Chest Press"],
    variations: ["Barbell Bench Press - Medium Grip", "Barbell Incline Bench Press - Medium Grip", "Dumbbell Bench Press"],
  },
  "barbell-incline-bench-press-medium-grip": {
    alternatives: ["Dumbbell Bench Press", "Cable Chest Press", "Pushups"],
    variations: ["Barbell Bench Press - Medium Grip", "Decline Barbell Bench Press", "Hammer Grip Incline DB Bench Press"],
  },
  "close-grip-barbell-bench-press": {
    alternatives: ["Bench Dips", "Dips - Triceps Version"],
    variations: ["Bench Dips", "Dips - Triceps Version"],
  },
  "dumbbell-bicep-curl": {
    alternatives: ["Alternate Hammer Curl", "Concentration Curls", "Barbell Curl"],
    variations: ["Alternate Hammer Curl", "Concentration Curls", "Barbell Curl"],
  },
  "dumbbell-one-arm-triceps-extension": {
    alternatives: ["Reverse Grip Triceps Pushdown", "Cable Rope Overhead Triceps Extension", "Decline Dumbbell Triceps Extension"],
    variations: ["Reverse Grip Triceps Pushdown", "Cable Rope Overhead Triceps Extension", "Decline Dumbbell Triceps Extension"],
  },
  "flat-bench-cable-flyes": {
    alternatives: ["Dumbbell Flyes", "Incline Dumbbell Flyes", "Decline Dumbbell Flyes"],
    variations: ["Incline Cable Chest Press", "Standing Cable Chest Press", "Cable Chest Press"],
  },
};

function getExerciseFamilyTags(exerciseName) {
  const normalizedName = exerciseName.toLowerCase();
  const tags = new Set();

  const familyMatchers = [
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
  ];

  for (const [tag, pattern] of familyMatchers) {
    if (pattern.test(normalizedName)) {
      tags.add(tag);
    }
  }

  return [...tags];
}

function normalizeMovementPatternForCompatibility(exercise) {
  const pattern = (exercise.movementPattern ?? "general").toLowerCase();
  const name = exercise.name.toLowerCase();

  if (["horizontal-push", "vertical-push", "elbow-flexion", "elbow-extension", "chest-fly"].includes(pattern)) {
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

function sharesExerciseFamily(left, right) {
  const leftTags = getExerciseFamilyTags(left.name);
  const rightTags = getExerciseFamilyTags(right.name);

  return leftTags.some((tag) => rightTags.includes(tag));
}

function sharesEquipment(left, right) {
  return left.equipment.some((item) => right.equipment.includes(item));
}

function sharesTrainingRole(left, right) {
  if (left.isCompound !== right.isCompound) {
    return false;
  }

  const leftPattern = normalizeMovementPatternForCompatibility(left);
  const rightPattern = normalizeMovementPatternForCompatibility(right);

  if (leftPattern === rightPattern) {
    return true;
  }

  return left.exerciseType === right.exerciseType && sharesExerciseFamily(left, right);
}

function hasUnsafeSubstitutionMismatch(base, candidate) {
  const basePattern = normalizeMovementPatternForCompatibility(base);
  const candidatePattern = normalizeMovementPatternForCompatibility(candidate);

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

function getSubstitutionCompatibilityScore(base, candidate) {
  if (hasUnsafeSubstitutionMismatch(base, candidate)) {
    return -1;
  }

  const basePattern = normalizeMovementPatternForCompatibility(base);
  const candidatePattern = normalizeMovementPatternForCompatibility(candidate);
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

function getVariationCompatibilityScore(base, candidate) {
  if (candidate.slug === base.slug || candidate.primaryMuscleGroup !== base.primaryMuscleGroup) {
    return -1;
  }

  const basePattern = normalizeMovementPatternForCompatibility(base);
  const candidatePattern = normalizeMovementPatternForCompatibility(candidate);
  const sameMovementPattern = candidatePattern === basePattern;
  const sameFamily = sharesExerciseFamily(base, candidate);

  if (!sameMovementPattern && !sameFamily) {
    return -1;
  }

  let score = 0;

  if (sameFamily) score += 4;
  if (sameMovementPattern) score += 3;
  if (sharesEquipment(base, candidate)) score += 3;
  if (candidate.isCompound === base.isCompound) score += 2;
  if (candidate.difficulty === base.difficulty) score += 1;
  if (LOW_QUALITY_SUBSTITUTION_PATTERN.test(candidate.name)) score -= 4;

  return score;
}

function buildRelationshipList(base, exercises, kind, limit = 3) {
  const override = EXERCISE_RELATIONSHIP_OVERRIDES[base.slug]?.[kind] ?? [];

  const overrideMatches = override
    .map((name) => exercises.find((candidate) => candidate.name === name) ?? null)
    .filter(Boolean);

  const scoredMatches = exercises
    .filter((candidate) => candidate.slug !== base.slug)
    .map((candidate) => ({
      candidate,
      score:
        kind === "alternatives"
          ? getSubstitutionCompatibilityScore(base, candidate)
          : getVariationCompatibilityScore(base, candidate),
    }))
    .filter((entry) => entry.score >= (kind === "alternatives" ? 10 : 8))
    .sort((left, right) => right.score - left.score || left.candidate.name.localeCompare(right.candidate.name))
    .map((entry) => entry.candidate);

  return [...overrideMatches, ...scoredMatches]
    .filter((candidate, index, collection) => collection.findIndex((entry) => entry.slug === candidate.slug) === index)
    .slice(0, limit)
    .map((candidate) => candidate.name);
}

function rebuildExerciseRelationships(exercises) {
  return exercises.map((exercise) => ({
    ...exercise,
    alternatives: buildRelationshipList(exercise, exercises, "alternatives"),
    variations: buildRelationshipList(exercise, exercises, "variations"),
  }));
}

function normalizeTrainingSnapshot(snapshot) {
  const normalizedExercises = snapshot.exercises.map((exercise) => applyExerciseOverrides({
    ...exercise,
    secondaryMuscleGroups: normalizeTextArray(exercise.secondaryMuscleGroups),
    equipment: normalizeTextArray(exercise.equipment),
    instructions: normalizeTextArray(exercise.instructions),
    commonMistakes: normalizeTextArray(exercise.commonMistakes),
    benefits: normalizeTextArray(exercise.benefits),
    alternatives: normalizeTextArray(exercise.alternatives),
    variations: normalizeTextArray(exercise.variations),
  }));
  const exercises = rebuildExerciseRelationships(deduplicateExercises(normalizedExercises));

  return {
    ...snapshot,
    exercises,
  };
}

async function readExistingSnapshot() {
  try {
    return JSON.parse(await fs.readFile(generatedDataPath, "utf8"));
  } catch {
    return null;
  }
}

async function readBootstrapSnapshot() {
  try {
    return JSON.parse(await fs.readFile(bootstrapDataPath, "utf8"));
  } catch {
    return null;
  }
}

async function writeSnapshot(snapshot) {
  await fs.mkdir(generatedDir, { recursive: true });
  await fs.writeFile(generatedDataPath, JSON.stringify(snapshot, null, 2));
}

async function fetchAllPages(table, select, extraParams = {}, order = "name.asc") {
  const rows = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      select,
      order,
      limit: String(pageSize),
      offset: String(offset),
      ...extraParams,
    });

    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${params.toString()}`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${table}: ${response.status} ${response.statusText}`);
    }

    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

function sanitizeExercise(row) {
  const exercise = {
    id: row.id,
    name: cleanText(row.name),
    slug: cleanText(row.slug),
    primaryMuscleGroup: normalizeText(row.primary_muscle_group),
    secondaryMuscleGroups: normalizeTextArray(row.secondary_muscle_groups),
    equipment: normalizeTextArray(row.equipment),
    movementPattern: normalizeText(row.movement_pattern),
    difficulty: normalizeText(row.difficulty),
    exerciseType: normalizeText(row.exercise_type),
    isCompound: normalizeBoolean(row.is_compound),
    instructions: normalizeTextArray(row.instructions),
    commonMistakes: normalizeTextArray(row.common_mistakes),
    benefits: normalizeTextArray(row.benefits),
    alternatives: normalizeTextArray(row.alternatives),
    variations: normalizeTextArray(row.variations),
    seoTitle: normalizeText(row.seo_title),
    seoDescription: normalizeText(row.seo_description),
    source: normalizeText(row.source),
    sourceLicense: normalizeText(row.source_license),
    createdAt: normalizeText(row.created_at),
    updatedAt: normalizeText(row.updated_at),
  };

  return applyExerciseOverrides(exercise);
}

function sanitizeWorkoutTemplate(row) {
  return {
    id: row.id,
    name: cleanText(row.name),
    slug: cleanText(row.slug),
    goal: normalizeText(row.goal),
    difficulty: normalizeText(row.difficulty),
    estimatedDurationMinutes: normalizeNumber(row.estimated_duration_minutes),
    equipment: normalizeTextArray(row.equipment),
    overview: normalizeText(row.overview),
    whoItIsFor: normalizeText(row.who_it_is_for),
    warmupGuidance: normalizeText(row.warmup_guidance),
    progressionGuidance: normalizeText(row.progression_guidance),
    experienceLevel: normalizeText(row.experience_level),
    trainingDaysPerWeek: normalizeNumber(row.training_days_per_week),
    targetMuscleGroups: normalizeTextArray(row.target_muscle_groups),
    seoTitle: normalizeText(row.seo_title),
    seoDescription: normalizeText(row.seo_description),
    isPublic: normalizeBoolean(row.is_public),
    createdAt: normalizeText(row.created_at),
    updatedAt: normalizeText(row.updated_at),
  };
}

function sanitizeWorkoutTemplateExercise(row) {
  return {
    id: row.id,
    workoutTemplateId: cleanText(row.workout_template_id ?? row.template_id),
    exerciseId: normalizeText(row.exercise_id),
    exerciseName: cleanText(row.exercise_name),
    dayLabel: normalizeText(row.day_label),
    section: normalizeText(row.section),
    sortOrder: normalizeNumber(row.sort_order) ?? 0,
    sets: normalizeText(row.sets),
    reps: normalizeText(row.reps),
    restSeconds: normalizeNumber(row.rest_seconds),
    notes: normalizeText(row.notes),
    createdAt: normalizeText(row.created_at),
  };
}

async function fetchTrainingSnapshot() {
  const exercises = (await fetchAllPages(
    "exercises",
    [
      "id",
      "name",
      "slug",
      "primary_muscle_group",
      "secondary_muscle_groups",
      "equipment",
      "movement_pattern",
      "difficulty",
      "exercise_type",
      "is_compound",
      "instructions",
      "common_mistakes",
      "benefits",
      "alternatives",
      "variations",
      "seo_title",
      "seo_description",
      "source",
      "source_license",
      "created_at",
      "updated_at",
    ].join(","),
  )).map(sanitizeExercise);

  const workoutTemplates = (await fetchAllPages(
    "workout_templates",
    [
      "id",
      "name",
      "slug",
      "goal",
      "difficulty",
      "estimated_duration_minutes",
      "equipment",
      "overview",
      "who_it_is_for",
      "warmup_guidance",
      "progression_guidance",
      "experience_level",
      "training_days_per_week",
      "target_muscle_groups",
      "seo_title",
      "seo_description",
      "is_public",
      "created_at",
      "updated_at",
    ].join(","),
    { is_public: "eq.true" },
    "goal.asc,name.asc",
  )).map(sanitizeWorkoutTemplate);

  const templateIds = workoutTemplates.map((template) => template.id).filter(Boolean);
  const workoutTemplateExercises =
    templateIds.length === 0
      ? []
      : (
          await fetchAllPages(
            "workout_template_exercises",
            [
              "id",
              "workout_template_id",
              "template_id",
              "exercise_id",
              "exercise_name",
              "day_label",
              "section",
              "sort_order",
              "sets",
              "reps",
              "rest_seconds",
              "notes",
              "created_at",
            ].join(","),
            {
              workout_template_id: `in.(${templateIds.join(",")})`,
            },
            "workout_template_id.asc,sort_order.asc",
          )
        ).map(sanitizeWorkoutTemplateExercise);

  return {
    generatedAt: new Date().toISOString(),
    exercises,
    workoutTemplates,
    workoutTemplateExercises,
  };
}

async function main() {
  const existingSnapshot = await readExistingSnapshot();
  const bootstrapSnapshot = await readBootstrapSnapshot();
  const normalizedExistingSnapshot =
    existingSnapshot && Array.isArray(existingSnapshot.exercises) && existingSnapshot.exercises.length > 0
      ? normalizeTrainingSnapshot(existingSnapshot)
      : null;
  const normalizedBootstrapSnapshot =
    bootstrapSnapshot && Array.isArray(bootstrapSnapshot.exercises) && bootstrapSnapshot.exercises.length > 0
      ? normalizeTrainingSnapshot(bootstrapSnapshot)
      : null;
  const bestFallbackSnapshot =
    normalizedBootstrapSnapshot
    ?? normalizedExistingSnapshot
    ?? normalizeTrainingSnapshot(emptySnapshot);

  if (!serviceRoleKey) {
    await writeSnapshot(bestFallbackSnapshot);
    console.log(
      `Skipped training data refresh because SUPABASE_SERVICE_ROLE_KEY is not set. Using ${
        bestFallbackSnapshot === normalizedBootstrapSnapshot
          ? "the shared bootstrap"
          : normalizedExistingSnapshot
            ? "the existing"
            : "the empty fallback"
      } training snapshot instead.`,
    );
    return;
  }

  try {
    const snapshot = normalizeTrainingSnapshot(await fetchTrainingSnapshot());
    await writeSnapshot(snapshot);
    console.log(
      `Generated training data for ${snapshot.exercises.length} exercises and ${snapshot.workoutTemplates.length} workout templates.`,
    );
  } catch (error) {
    await writeSnapshot(bestFallbackSnapshot);
    console.warn(
      `Fell back to ${
        bestFallbackSnapshot === normalizedBootstrapSnapshot
          ? "the shared bootstrap"
          : normalizedExistingSnapshot
            ? "the previous"
            : "an empty"
      } training snapshot because Supabase training data could not be loaded.`,
    );
    console.warn(error instanceof Error ? error.message : error);
  }
}

await main();
