import fs from "node:fs";
import path from "node:path";
import { getAllPosts } from "../lib/blog.ts";
import {
  buildRestaurantSummaries,
  getRestaurantSlugMap,
  type NutritionProduct,
} from "../lib/nutrition-data.ts";
import { absoluteUrl, normalizeSitePath } from "../lib/site.ts";
import {
  EXERCISE_MUSCLE_CATEGORIES,
  getExerciseSubstitutionCompatibilityScore,
  WORKOUT_GOALS,
  getNormalizedExerciseMovementPattern,
  getExerciseSubstitutions,
  getExercisesByCategorySlug,
  type ExerciseRecord,
  type WorkoutTemplateExerciseRecord,
  type WorkoutTemplateRecord,
} from "../lib/training-data.ts";
import { getExerciseContentScore } from "../lib/training-seo.ts";

type TrainingSnapshot = {
  exercises: ExerciseRecord[];
  workoutTemplates: WorkoutTemplateRecord[];
  workoutTemplateExercises: WorkoutTemplateExerciseRecord[];
};

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, "out");
const publicDir = path.join(projectRoot, "public");
const sitemapIndexPath = fs.existsSync(path.join(outDir, "sitemap.xml"))
  ? path.join(outDir, "sitemap.xml")
  : path.join(publicDir, "sitemap.xml");
const trainingDataPath = path.join(projectRoot, ".generated", "training-data.json");
const nutritionDataPath = path.join(projectRoot, ".generated", "nutrition-data.json");

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function parseLocs(xml: string) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1] ?? "").filter(Boolean);
}

function toSitePathFromUrl(url: string) {
  const pathname = new URL(url).pathname;
  return normalizeSitePath(pathname);
}

function toOutputFile(sitePath: string) {
  const sanitized = sitePath.startsWith("/") ? sitePath.slice(1) : sitePath;

  if (!sanitized) {
    return path.join(outDir, "index.html");
  }

  if (sanitized.endsWith(".xml")) {
    return path.join(outDir, sanitized);
  }

  if (sanitized.endsWith(".html")) {
    return path.join(outDir, sanitized);
  }

  return path.join(outDir, sanitized, "index.html");
}

function fileExistsForUrl(url: string) {
  return fs.existsSync(toOutputFile(toSitePathFromUrl(url)));
}

function readHtmlForUrl(url: string) {
  const outputFile = toOutputFile(toSitePathFromUrl(url));

  if (!fs.existsSync(outputFile)) {
    return null;
  }

  return fs.readFileSync(outputFile, "utf8");
}

function extractTitle(html: string) {
  return html.match(/<title>(.*?)<\/title>/i)?.[1]?.trim() ?? "";
}

function extractMetaDescription(html: string) {
  return html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]?.trim() ?? "";
}

function extractCanonical(html: string) {
  return html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i)?.[1]?.trim() ?? "";
}

function extractRobots(html: string) {
  return html.match(/<meta\s+name="robots"\s+content="([^"]*)"/i)?.[1]?.trim().toLowerCase() ?? "";
}

function extractInternalLinks(html: string) {
  return [...html.matchAll(/<a[^>]+href="([^"]+)"/gi)]
    .map((match) => match[1] ?? "")
    .filter((href) => href.startsWith("/") && !href.startsWith("//"))
    .map((href) => normalizeSitePath(href));
}

function slugDuplicates(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()].filter(([, count]) => count > 1);
}

function isClearlyRelevantSecondaryMatch(exercise: ExerciseRecord, categorySlug: string) {
  return categorySlug === "glutes"
    && exercise.secondaryMuscleGroups.includes("glutes")
    && exercise.primaryMuscleGroup === "legs"
    && ["hinge", "squat", "single-leg", "general"].includes(exercise.movementPattern ?? "general");
}

function printSection(title: string, lines: string[]) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));

  if (lines.length === 0) {
    console.log("None");
    return;
  }

  for (const line of lines) {
    console.log(line);
  }
}

function findExerciseByName(exercises: ExerciseRecord[], exerciseName: string) {
  return exercises.find((exercise) => exercise.name === exerciseName) ?? null;
}

function main() {
  if (!fs.existsSync(outDir)) {
    throw new Error("Static export output is missing. Run `npm run build` before running the SEO audit.");
  }

  const trainingSnapshot = readJsonFile<TrainingSnapshot>(trainingDataPath, {
    exercises: [],
    workoutTemplates: [],
    workoutTemplateExercises: [],
  });
  const nutritionProducts = readJsonFile<NutritionProduct[]>(nutritionDataPath, []);
  const posts = getAllPosts();
  const restaurants = buildRestaurantSummaries(nutritionProducts);
  const restaurantLookup = getRestaurantSlugMap(nutritionProducts);

  const sitemapIndexXml = fs.readFileSync(sitemapIndexPath, "utf8");
  const sitemapUrls = parseLocs(sitemapIndexXml);
  const sitemapFilePaths = sitemapUrls.map((url) => toOutputFile(toSitePathFromUrl(url)));
  const childSitemapUrls = sitemapFilePaths.flatMap((filePath) => {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    return parseLocs(fs.readFileSync(filePath, "utf8"));
  });

  const canonicalPageUrls = [...new Set(childSitemapUrls)];
  const totalHtmlFiles = walkHtmlFiles(outDir).length;

  const non200Urls = canonicalPageUrls.filter((url) => !fileExistsForUrl(url));
  const missingCanonical: string[] = [];
  const missingMetaTitle: string[] = [];
  const missingMetaDescription: string[] = [];
  const unexpectedNoindex: string[] = [];
  const linkGraph = new Map<string, string[]>();

  for (const url of canonicalPageUrls) {
    const html = readHtmlForUrl(url);

    if (!html) {
      continue;
    }

    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const canonical = extractCanonical(html);
    const robots = extractRobots(html);
    const sitePath = toSitePathFromUrl(url);

    if (!title) {
      missingMetaTitle.push(url);
    }

    if (!description) {
      missingMetaDescription.push(url);
    }

    if (!canonical || canonical !== absoluteUrl(sitePath)) {
      missingCanonical.push(url);
    }

    if (robots.includes("noindex")) {
      unexpectedNoindex.push(url);
    }

    linkGraph.set(sitePath, extractInternalLinks(html));
  }

  const duplicateSlugs = [
    ...slugDuplicates(trainingSnapshot.exercises.map((exercise) => exercise.slug)).map(
      ([slug, count]) => `exercise slug "${slug}" appears ${count} times`,
    ),
    ...slugDuplicates(trainingSnapshot.workoutTemplates.map((workout) => workout.slug)).map(
      ([slug, count]) => `workout slug "${slug}" appears ${count} times`,
    ),
    ...slugDuplicates(posts.map((post) => post.slug)).map(([slug, count]) => `blog slug "${slug}" appears ${count} times`),
    ...slugDuplicates(restaurants.map((restaurant) => restaurant.slug)).map(
      ([slug, count]) => `restaurant slug "${slug}" appears ${count} times`,
    ),
  ];

  const shortExerciseContent = trainingSnapshot.exercises
    .filter((exercise) => getExerciseContentScore(exercise) < 10)
    .map((exercise) => `${exercise.name} (${exercise.slug}) score=${getExerciseContentScore(exercise)}`);

  const categoryMismatches = EXERCISE_MUSCLE_CATEGORIES.flatMap((category) =>
    getExercisesByCategorySlug(trainingSnapshot.exercises, category.slug)
      .filter(
        (exercise) =>
          exercise.primaryMuscleGroup !== category.slug && !isClearlyRelevantSecondaryMatch(exercise, category.slug),
      )
      .map((exercise) => `${category.slug}: ${exercise.name} (${exercise.slug})`),
  );

  const substitutionMismatches = trainingSnapshot.exercises.flatMap((exercise) =>
    getExerciseSubstitutions(exercise, trainingSnapshot.exercises, 3)
      .filter((candidate) => candidate.primaryMuscleGroup !== exercise.primaryMuscleGroup)
      .map(
        (candidate) =>
          `${exercise.slug} -> ${candidate.slug} (${exercise.primaryMuscleGroup ?? "none"} vs ${candidate.primaryMuscleGroup ?? "none"})`,
      ),
  );

  const benchPressClassificationIssues = [
    { slug: "bench-press-powerlifting", expectedPrimary: "chest", expectedPattern: "horizontal-push", requiredSecondaries: ["shoulders", "arms"] },
    { slug: "barbell-bench-press-medium-grip", expectedPrimary: "chest", expectedPattern: "horizontal-push", requiredSecondaries: ["shoulders", "arms"] },
    { slug: "barbell-incline-bench-press-medium-grip", expectedPrimary: "chest", expectedPattern: "horizontal-push", requiredSecondaries: ["shoulders", "arms"] },
    { slug: "dumbbell-bench-press", expectedPrimary: "chest", expectedPattern: "horizontal-push", requiredSecondaries: ["shoulders", "arms"] },
    { slug: "pushups", expectedPrimary: "chest", expectedPattern: "horizontal-push", requiredSecondaries: ["shoulders", "arms"] },
    { slug: "close-grip-barbell-bench-press", expectedPrimary: "arms", expectedPattern: "horizontal-push", requiredSecondaries: ["chest", "shoulders"] },
    { slug: "dumbbell-bicep-curl", expectedPrimary: "arms", expectedPattern: "elbow-flexion", requiredSecondaries: [] },
    { slug: "dumbbell-one-arm-triceps-extension", expectedPrimary: "arms", expectedPattern: "elbow-extension", requiredSecondaries: [] },
  ].flatMap((target) => {
    const exercise = trainingSnapshot.exercises.find((entry) => entry.slug === target.slug);

    if (!exercise) {
      return [`Missing exercise record for ${target.slug}`];
    }

    const issues: string[] = [];

    if (exercise.primaryMuscleGroup !== target.expectedPrimary) {
      issues.push(`${target.slug}: expected primary ${target.expectedPrimary}, found ${exercise.primaryMuscleGroup ?? "none"}`);
    }

    if (getNormalizedExerciseMovementPattern(exercise) !== target.expectedPattern) {
      issues.push(
        `${target.slug}: expected movement ${target.expectedPattern}, found ${getNormalizedExerciseMovementPattern(exercise)}`,
      );
    }

    for (const secondary of target.requiredSecondaries) {
      if (!exercise.secondaryMuscleGroups.includes(secondary)) {
        issues.push(`${target.slug}: missing secondary muscle ${secondary}`);
      }
    }

    if (target.requiredSecondaries.length === 0 && exercise.secondaryMuscleGroups.length > 0) {
      issues.push(`${target.slug}: expected no secondary muscles, found ${exercise.secondaryMuscleGroups.join(", ")}`);
    }

    return issues;
  });

  const incompatibleNamedAlternatives = trainingSnapshot.exercises.flatMap((exercise) =>
    exercise.alternatives.flatMap((alternativeName) => {
      const candidate = findExerciseByName(trainingSnapshot.exercises, alternativeName);

      if (!candidate) {
        return [];
      }

      const compatibilityScore = getExerciseSubstitutionCompatibilityScore(exercise, candidate);

      if (compatibilityScore >= 10) {
        return [];
      }

      return [
        `${exercise.slug} -> ${candidate.slug} score=${compatibilityScore} pattern=${getNormalizedExerciseMovementPattern(exercise)}=>${getNormalizedExerciseMovementPattern(candidate)}`,
      ];
    }),
  );

  const pressingToArmIsolationIssues = trainingSnapshot.exercises.flatMap((exercise) => {
    const basePattern = getNormalizedExerciseMovementPattern(exercise);

    if (basePattern !== "horizontal-push") {
      return [];
    }

    return exercise.alternatives.flatMap((alternativeName) => {
      const candidate = findExerciseByName(trainingSnapshot.exercises, alternativeName);

      if (!candidate) {
        return [];
      }

      const candidatePattern = getNormalizedExerciseMovementPattern(candidate);
      const isArmIsolation =
        candidate.primaryMuscleGroup === "arms" && !candidate.isCompound && ["elbow-flexion", "elbow-extension"].includes(candidatePattern);

      return isArmIsolation ? [`${exercise.slug} -> ${candidate.slug}`] : [];
    });
  });

  const benchWorkoutSubstitutionIssues = (() => {
    const benchWorkout = trainingSnapshot.workoutTemplates.find((template) => template.slug === "bench-press-focused-workout");

    if (!benchWorkout) {
      return ["Missing workout record for bench-press-focused-workout"];
    }

    return trainingSnapshot.workoutTemplateExercises
      .filter((entry) => entry.workoutTemplateId === benchWorkout.id)
      .flatMap((entry) => {
        const exercise = entry.exerciseId
          ? trainingSnapshot.exercises.find((candidate) => candidate.id === entry.exerciseId) ?? null
          : findExerciseByName(trainingSnapshot.exercises, entry.exerciseName);

        if (!exercise) {
          return [`Missing exercise record for workout entry ${entry.exerciseName}`];
        }

        if (getNormalizedExerciseMovementPattern(exercise) !== "horizontal-push") {
          return [];
        }

        return getExerciseSubstitutions(exercise, trainingSnapshot.exercises, 3)
          .filter((candidate) => {
            const candidatePattern = getNormalizedExerciseMovementPattern(candidate);
            const isArmIsolation =
              candidate.primaryMuscleGroup === "arms" && !candidate.isCompound && ["elbow-flexion", "elbow-extension"].includes(candidatePattern);

            return isArmIsolation;
          })
          .map((candidate) => `${exercise.slug} -> ${candidate.slug}`);
      });
  })();

  const hubPaths = new Set<string>([
    "/",
    "/apps/",
    "/blog/",
    "/calculators/",
    "/exercises/",
    "/nutrition/",
    "/workouts/",
    ...EXERCISE_MUSCLE_CATEGORIES.map((category) => normalizeSitePath(`/exercises/${category.slug}`)),
    ...WORKOUT_GOALS.map((goal) => normalizeSitePath(`/workouts/${goal.slug}`)),
  ]);

  const reachablePaths = new Set<string>();
  const queue = [...hubPaths].filter((sitePath) => linkGraph.has(sitePath));

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (reachablePaths.has(current)) {
      continue;
    }

    reachablePaths.add(current);

    const outgoing = linkGraph.get(current) ?? [];

    for (const destination of outgoing) {
      if (linkGraph.has(destination) && !reachablePaths.has(destination)) {
        queue.push(destination);
      }
    }
  }

  const pagesNotLinkedFromHub = canonicalPageUrls
    .map((url) => toSitePathFromUrl(url))
    .filter((sitePath) => !reachablePaths.has(sitePath))
    .map((sitePath) => absoluteUrl(sitePath));

  const unknownRestaurantSlugs = restaurants
    .filter((restaurant) => restaurantLookup.nameBySlug.get(restaurant.slug) == null)
    .map((restaurant) => restaurant.slug);

  console.log("SEO Audit Summary");
  console.log("-----------------");
  console.log(`Total exported HTML pages: ${totalHtmlFiles}`);
  console.log(`Sitemap files discovered: ${sitemapUrls.length}`);
  console.log(`Sitemap URLs discovered: ${canonicalPageUrls.length}`);
  console.log(`URLs returning non-200 in static export: ${non200Urls.length}`);

  printSection("Duplicate slugs", duplicateSlugs);
  printSection("Missing canonical", missingCanonical.slice(0, 25));
  printSection("Missing meta title", missingMetaTitle.slice(0, 25));
  printSection("Missing meta description", missingMetaDescription.slice(0, 25));
  printSection("Unexpected noindex pages", unexpectedNoindex.slice(0, 25));
  printSection("Exercise pages with very short content", shortExerciseContent.slice(0, 50));
  printSection("Bench press classification issues", benchPressClassificationIssues.slice(0, 50));
  printSection("Category mismatches", categoryMismatches.slice(0, 50));
  printSection("Workout substitutions with mismatched muscle groups", substitutionMismatches.slice(0, 50));
  printSection("Incompatible named exercise alternatives", incompatibleNamedAlternatives.slice(0, 50));
  printSection("Pressing movements pointing to arm-isolation alternatives", pressingToArmIsolationIssues.slice(0, 50));
  printSection("Bench Press-Focused Workout substitution issues", benchWorkoutSubstitutionIssues.slice(0, 50));
  printSection("Pages not linked from any hub", pagesNotLinkedFromHub.slice(0, 50));
  printSection("Unknown restaurant slugs", unknownRestaurantSlugs);
}

function walkHtmlFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkHtmlFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files;
}

main();
