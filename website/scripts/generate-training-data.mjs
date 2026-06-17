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
  return {
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
  const bestFallbackSnapshot =
    existingSnapshot && Array.isArray(existingSnapshot.exercises) && existingSnapshot.exercises.length > 0
      ? existingSnapshot
      : bootstrapSnapshot ?? existingSnapshot ?? emptySnapshot;

  if (!serviceRoleKey) {
    await writeSnapshot(bestFallbackSnapshot);
    console.log(
      `Skipped training data refresh because SUPABASE_SERVICE_ROLE_KEY is not set. Using ${
        bestFallbackSnapshot === bootstrapSnapshot ? "the shared bootstrap" : "the existing"
      } training snapshot instead.`,
    );
    return;
  }

  try {
    const snapshot = await fetchTrainingSnapshot();
    await writeSnapshot(snapshot);
    console.log(
      `Generated training data for ${snapshot.exercises.length} exercises and ${snapshot.workoutTemplates.length} workout templates.`,
    );
  } catch (error) {
    await writeSnapshot(bestFallbackSnapshot);
    console.warn(
      `Fell back to ${
        bestFallbackSnapshot === bootstrapSnapshot
          ? "the shared bootstrap"
          : existingSnapshot
            ? "the previous"
            : "an empty"
      } training snapshot because Supabase training data could not be loaded.`,
    );
    console.warn(error instanceof Error ? error.message : error);
  }
}

await main();
