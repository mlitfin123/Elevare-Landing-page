import fs from "node:fs";
import path from "node:path";
import { getAllCategories, getAllPosts } from "../lib/blog.ts";
import { buildRestaurantSummaries, getPopularRestaurants, type NutritionProduct } from "../lib/nutrition-data.ts";
import { absoluteUrl, normalizeSitePath } from "../lib/site.ts";
import {
  EXERCISE_EQUIPMENT_CATEGORIES,
  EXERCISE_MUSCLE_CATEGORIES,
  WORKOUT_GOALS,
  type ExerciseRecord,
  type WorkoutTemplateRecord,
} from "../lib/training-data.ts";
import {
  getExerciseIndexPriority,
  getWorkoutIndexPriority,
  type IndexPriority,
} from "../lib/training-seo.ts";
import { getCalculatorPath, tools } from "../lib/tools.ts";

type SitemapEntry = {
  url: string;
  lastModified: string;
  priority: IndexPriority;
};

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const sitemapsDir = path.join(publicDir, "sitemaps");
const trainingDataPath = path.join(projectRoot, ".generated", "training-data.json");
const nutritionDataPath = path.join(projectRoot, ".generated", "nutrition-data.json");
const buildDate = new Date().toISOString();

const staticSiteRoutes = ["/", "/apps", "/logbook", "/stagelab", "/elevare"] as const;
const restaurantNutritionViews = ["high-protein", "low-calorie", "under-500-calories", "low-carb"] as const;
const fastFoodNutritionViews = ["high-protein", "low-calorie", "under-500-calories"] as const;

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function xmlDate(value: string | null | undefined) {
  if (!value) {
    return buildDate;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? buildDate : parsed.toISOString();
}

function buildUrlset(entries: SitemapEntry[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${escapeXml(entry.url)}</loc>\n    <lastmod>${entry.lastModified}</lastmod>\n  </url>`,
    )
    .join("\n")}\n</urlset>\n`;
}

function buildSitemapIndex(sitemapNames: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapNames
    .map(
      (name) =>
        `  <sitemap>\n    <loc>${escapeXml(absoluteUrl(`/sitemaps/${name}.xml`))}</loc>\n    <lastmod>${buildDate}</lastmod>\n  </sitemap>`,
    )
    .join("\n")}\n</sitemapindex>\n`;
}

function toSitemapEntry(pathname: string, lastModified = buildDate, priority: IndexPriority = "standard_index"): SitemapEntry {
  return {
    url: absoluteUrl(normalizeSitePath(pathname)),
    lastModified,
    priority,
  };
}

function keepIndexableEntries(entries: SitemapEntry[]) {
  return entries.filter((entry) => entry.priority !== "low_priority");
}

function writeFileSafely(filePath: string, contents: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function buildSiteEntries() {
  return staticSiteRoutes.map((route) => toSitemapEntry(route, buildDate, "priority_index"));
}

function buildCalculatorEntries() {
  return [
    toSitemapEntry("/calculators", buildDate, "priority_index"),
    toSitemapEntry("/tools/workout-generator", buildDate, "priority_index"),
    ...tools.map((tool) => toSitemapEntry(getCalculatorPath(tool.slug), buildDate, "priority_index")),
  ];
}

function buildExerciseEntries(exercises: ExerciseRecord[]) {
  const exercisePages = exercises.map((exercise) =>
    toSitemapEntry(`/exercises/${exercise.slug}`, xmlDate(exercise.updatedAt), getExerciseIndexPriority(exercise)),
  );
  const categoryPages = [...EXERCISE_MUSCLE_CATEGORIES, ...EXERCISE_EQUIPMENT_CATEGORIES].map((category) =>
    toSitemapEntry(`/exercises/${category.slug}`, buildDate, "priority_index"),
  );

  return [toSitemapEntry("/exercises", buildDate, "priority_index"), ...categoryPages, ...exercisePages];
}

function buildWorkoutEntries(workouts: WorkoutTemplateRecord[]) {
  const workoutPages = workouts.map((workout) =>
    toSitemapEntry(`/workouts/${workout.slug}`, xmlDate(workout.updatedAt), getWorkoutIndexPriority(workout)),
  );
  const goalPages = WORKOUT_GOALS.map((goal) => toSitemapEntry(`/workouts/${goal.slug}`, buildDate, "priority_index"));

  return [toSitemapEntry("/workouts", buildDate, "priority_index"), ...goalPages, ...workoutPages];
}

function buildNutritionEntries(products: NutritionProduct[]) {
  const restaurants = buildRestaurantSummaries(products);
  const popularRestaurants = getPopularRestaurants(restaurants);
  const popularRestaurantSlugs = new Set(popularRestaurants.map((restaurant) => restaurant.slug));

  const restaurantPages = popularRestaurants.map((restaurant) =>
    toSitemapEntry(
      `/nutrition/${restaurant.slug}`,
      buildDate,
      "priority_index",
    ),
  );

  const variantPages = popularRestaurants.flatMap((restaurant) =>
    restaurantNutritionViews.map((view) =>
      toSitemapEntry(
        `/nutrition/${restaurant.slug}/${view}`,
        buildDate,
        popularRestaurantSlugs.has(restaurant.slug) ? "standard_index" : "low_priority",
      ),
    ),
  );

  const fastFoodPages = fastFoodNutritionViews.map((view) =>
    toSitemapEntry(`/nutrition/fast-food/${view}`, buildDate, "priority_index"),
  );

  return [
    toSitemapEntry("/nutrition", buildDate, "priority_index"),
    ...restaurantPages,
    ...variantPages,
    ...fastFoodPages,
  ];
}

function buildBlogEntries() {
  const posts = getAllPosts();
  const categoryPages = getAllCategories().map((category) =>
    toSitemapEntry(`/blog/category/${category}`, buildDate, "standard_index"),
  );

  return [
    toSitemapEntry("/blog", buildDate, "priority_index"),
    ...categoryPages,
    ...posts.map((post) => toSitemapEntry(`/blog/${post.slug}`, xmlDate(post.date), "standard_index")),
  ];
}

function main() {
  const trainingSnapshot = readJsonFile<{
    exercises: ExerciseRecord[];
    workoutTemplates: WorkoutTemplateRecord[];
  }>(trainingDataPath, {
    exercises: [],
    workoutTemplates: [],
  });

  const nutritionProducts = readJsonFile<NutritionProduct[]>(nutritionDataPath, []);

  const sitemapFiles: Array<{ name: string; entries: SitemapEntry[] }> = [
    { name: "site", entries: buildSiteEntries() },
    { name: "calculators", entries: buildCalculatorEntries() },
    { name: "exercises", entries: buildExerciseEntries(trainingSnapshot.exercises) },
    { name: "workouts", entries: buildWorkoutEntries(trainingSnapshot.workoutTemplates) },
    { name: "nutrition", entries: buildNutritionEntries(nutritionProducts) },
    { name: "blog", entries: buildBlogEntries() },
  ];

  for (const sitemap of sitemapFiles) {
    writeFileSafely(path.join(sitemapsDir, `${sitemap.name}.xml`), buildUrlset(keepIndexableEntries(sitemap.entries)));
  }

  writeFileSafely(
    path.join(publicDir, "sitemap.xml"),
    buildSitemapIndex(sitemapFiles.map((sitemap) => sitemap.name)),
  );

  console.log(
    `Generated sitemap index and ${sitemapFiles.length} segmented sitemaps with ${
      sitemapFiles.flatMap((sitemap) => keepIndexableEntries(sitemap.entries)).length
    } indexable URLs.`,
  );
}

main();
