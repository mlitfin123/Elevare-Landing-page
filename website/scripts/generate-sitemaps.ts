import fs from "node:fs";
import path from "node:path";
import {
  getAllCategories,
  getAllPosts,
  getPostsByCategory,
  isBlogCategoryIndexable,
} from "../lib/blog.ts";
import { MARKETPLACE_CATEGORY_SEEDS } from "../lib/marketplace-categories.ts";
import type { MarketplaceSnapshot, ProfessionalProfileRecord } from "../lib/marketplace-types.ts";
import {
  getIndexableMarketplaceProfessionals,
  isMarketplaceCategoryIndexable,
} from "../lib/marketplace-seo.ts";
import {
  applyNutritionVariant,
  buildRestaurantSummaries,
  getFastFoodItems,
  getPopularRestaurants,
  type NutritionProduct,
} from "../lib/nutrition-data.ts";
import {
  isNutritionVariantIndexable,
  restaurantNutritionViews,
  fastFoodNutritionViews,
} from "../lib/nutrition-pages.ts";
import { absoluteUrl, normalizeSitePath } from "../lib/site.ts";
import { isLocalizedIndexingEnabled, localizePathname } from "../lib/i18n/config.ts";
import {
  canonicalizeTrainingSnapshot,
  EXERCISE_EQUIPMENT_CATEGORIES,
  EXERCISE_MUSCLE_CATEGORIES,
  WORKOUT_GOALS,
  type ExerciseRecord,
  type TrainingDataSnapshot,
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
  lastModified?: string;
  priority: IndexPriority;
};

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const sitemapsDir = path.join(publicDir, "sitemaps");
const trainingDataPath = path.join(projectRoot, ".generated", "training-data.json");
const nutritionDataPath = path.join(projectRoot, ".generated", "nutrition-data.json");
const marketplaceDataPath = path.join(projectRoot, ".generated", "marketplace-data.json");

const staticSiteRoutes = [
  "/",
  "/apps",
  "/shop",
  "/logbook",
  "/stagelab",
  "/stagelab/quick-analysis",
  "/elevare",
  "/privacy-policy/",
  "/terms-of-service/",
] as const;

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
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function latestContentDate(values: Array<string | null | undefined>) {
  const dates = values
    .map((value) => xmlDate(value))
    .filter((value): value is string => value != null)
    .sort();

  return dates.at(-1);
}

function buildUrlset(entries: SitemapEntry[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map(
      (entry) => {
        const lastModified = entry.lastModified
          ? `\n    <lastmod>${entry.lastModified}</lastmod>`
          : "";

        return `  <url>\n    <loc>${escapeXml(entry.url)}</loc>${lastModified}\n  </url>`;
      },
    )
    .join("\n")}\n</urlset>\n`;
}

function buildSitemapIndex(sitemapNames: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapNames
    .map(
      (name) =>
        `  <sitemap>\n    <loc>${escapeXml(absoluteUrl(`/sitemaps/${name}.xml`))}</loc>\n  </sitemap>`,
    )
    .join("\n")}\n</sitemapindex>\n`;
}

function toSitemapEntry(pathname: string, lastModified?: string, priority: IndexPriority = "standard_index"): SitemapEntry {
  return {
    url: absoluteUrl(normalizeSitePath(pathname)),
    lastModified,
    priority,
  };
}

function keepIndexableEntries(entries: SitemapEntry[]) {
  return entries.filter((entry) => entry.priority !== "low_priority");
}

function assertUniqueSitemapEntries(sitemaps: Array<{ name: string; entries: SitemapEntry[] }>) {
  const ownerByUrl = new Map<string, string>();

  for (const sitemap of sitemaps) {
    for (const entry of keepIndexableEntries(sitemap.entries)) {
      const existingOwner = ownerByUrl.get(entry.url);

      if (existingOwner) {
        throw new Error(`Duplicate sitemap URL ${entry.url} appears in ${existingOwner} and ${sitemap.name}.`);
      }

      ownerByUrl.set(entry.url, sitemap.name);
    }
  }
}

function writeFileSafely(filePath: string, contents: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function buildSiteEntries() {
  const entries = staticSiteRoutes.map((route) => toSitemapEntry(route, undefined, "priority_index"));

  if (!isLocalizedIndexingEnabled()) return entries;

  const localizedRoutes = (["es-419", "pt-BR"] as const).flatMap((locale) =>
    ["/", "/logbook/", "/stagelab/", "/stagelab/quick-analysis/"].map((route) =>
      toSitemapEntry(localizePathname(route, locale), undefined, "priority_index"),
    ),
  );

  return [...entries, ...localizedRoutes];
}

function buildCalculatorEntries() {
  return [
    toSitemapEntry("/calculators", undefined, "priority_index"),
    toSitemapEntry("/tools/workout-generator", undefined, "priority_index"),
    ...tools.map((tool) => toSitemapEntry(getCalculatorPath(tool.slug), undefined, "priority_index")),
  ];
}

function buildExerciseEntries(exercises: ExerciseRecord[]) {
  const exercisePages = exercises.map((exercise) =>
    toSitemapEntry(`/exercises/${exercise.slug}`, xmlDate(exercise.updatedAt), getExerciseIndexPriority(exercise)),
  );
  const categoryPages = [...EXERCISE_MUSCLE_CATEGORIES, ...EXERCISE_EQUIPMENT_CATEGORIES].map((category) =>
    toSitemapEntry(`/exercises/${category.slug}`, undefined, "priority_index"),
  );

  return [toSitemapEntry("/exercises", undefined, "priority_index"), ...categoryPages, ...exercisePages];
}

function buildWorkoutEntries(workouts: WorkoutTemplateRecord[]) {
  const workoutPages = workouts.map((workout) =>
    toSitemapEntry(`/workouts/${workout.slug}`, xmlDate(workout.updatedAt), getWorkoutIndexPriority(workout)),
  );
  const goalPages = WORKOUT_GOALS.map((goal) => toSitemapEntry(`/workouts/${goal.slug}`, undefined, "priority_index"));

  return [toSitemapEntry("/workouts", undefined, "priority_index"), ...goalPages, ...workoutPages];
}

function buildNutritionEntries(products: NutritionProduct[]) {
  const restaurants = buildRestaurantSummaries(products);
  const popularRestaurants = getPopularRestaurants(restaurants);
  const itemsByRestaurant = new Map<string, NutritionProduct[]>();

  for (const product of products) {
    const restaurant = restaurants.find((candidate) => candidate.name === product.restaurantName);

    if (restaurant) {
      itemsByRestaurant.set(restaurant.slug, [...(itemsByRestaurant.get(restaurant.slug) ?? []), product]);
    }
  }

  const restaurantPages = popularRestaurants.map((restaurant) => {
    const restaurantItems = itemsByRestaurant.get(restaurant.slug) ?? [];

    return toSitemapEntry(
      `/nutrition/${restaurant.slug}`,
      latestContentDate(restaurantItems.map((item) => item.updatedAt)),
      "priority_index",
    );
  });

  const variantPages = popularRestaurants.flatMap((restaurant) =>
    restaurantNutritionViews.flatMap((view) => {
      const variantItems = applyNutritionVariant(itemsByRestaurant.get(restaurant.slug) ?? [], view);

      return isNutritionVariantIndexable(variantItems)
        ? [toSitemapEntry(
            `/nutrition/${restaurant.slug}/${view}`,
            latestContentDate(variantItems.map((item) => item.updatedAt)),
            "standard_index",
          )]
        : [];
    }),
  );

  const fastFoodItems = getFastFoodItems(products);
  const fastFoodPages = fastFoodNutritionViews.flatMap((view) => {
    const variantItems = applyNutritionVariant(fastFoodItems, view);

    return isNutritionVariantIndexable(variantItems)
      ? [toSitemapEntry(
          `/nutrition/fast-food/${view}`,
          latestContentDate(variantItems.map((item) => item.updatedAt)),
          "priority_index",
        )]
      : [];
  });

  return [
    toSitemapEntry("/nutrition", latestContentDate(products.map((item) => item.updatedAt)), "priority_index"),
    toSitemapEntry("/nutrition/methodology", undefined, "standard_index"),
    ...restaurantPages,
    ...variantPages,
    ...fastFoodPages,
  ];
}

function buildBlogEntries() {
  const posts = getAllPosts();
  const categoryPages = getAllCategories()
    .filter((category) => isBlogCategoryIndexable(category))
    .map((category) => {
      const categoryPosts = getPostsByCategory(category);
      return toSitemapEntry(`/blog/category/${category}`, xmlDate(categoryPosts[0]?.date), "standard_index");
    });

  return [
    toSitemapEntry("/blog", xmlDate(posts[0]?.date), "priority_index"),
    ...categoryPages,
    ...posts.map((post) => toSitemapEntry(`/blog/${post.slug}`, xmlDate(post.date), "standard_index")),
  ];
}

function buildMarketplaceEntries(snapshot: MarketplaceSnapshot) {
  const categories =
    snapshot.categories.length > 0
       ? snapshot.categories
       : MARKETPLACE_CATEGORY_SEEDS.map((category) => ({
           id: category.slug,
           stableId: category.stableId,
           slug: category.slug,
           publicSlug: category.publicSlug,
           label: category.label,
          headline: category.headline,
          shortDescription: category.shortDescription,
          sortOrder: category.sortOrder,
          isActive: true,
        }));

  const publicProfessionals = getIndexableMarketplaceProfessionals(snapshot.professionals);
  const profileEntries = publicProfessionals.map((professional: ProfessionalProfileRecord) =>
    toSitemapEntry(`/professionals/${professional.profileSlug}`, xmlDate(professional.updatedAt), "standard_index"),
  );
  const categoryEntries = categories
    .filter((category) => isMarketplaceCategoryIndexable(category, publicProfessionals))
    .map((category) =>
      toSitemapEntry(`/professionals/${category.slug}`, undefined, "priority_index"),
    );

  return [toSitemapEntry("/professionals", undefined, "priority_index"), ...categoryEntries, ...profileEntries];
}

function main() {
  const trainingSnapshot = canonicalizeTrainingSnapshot(readJsonFile<TrainingDataSnapshot>(trainingDataPath, {
    generatedAt: null,
    exercises: [],
    workoutTemplates: [],
    workoutTemplateExercises: [],
    workoutRedirects: [],
  }));

  const nutritionProducts = readJsonFile<NutritionProduct[]>(nutritionDataPath, []);
  const marketplaceSnapshot = readJsonFile<MarketplaceSnapshot>(marketplaceDataPath, {
    generatedAt: null,
    categories: [],
    professionals: [],
  });

  const sitemapFiles: Array<{ name: string; entries: SitemapEntry[] }> = [
    { name: "site", entries: buildSiteEntries() },
    { name: "calculators", entries: buildCalculatorEntries() },
    { name: "exercises", entries: buildExerciseEntries(trainingSnapshot.exercises) },
    { name: "workouts", entries: buildWorkoutEntries(trainingSnapshot.workoutTemplates) },
    { name: "nutrition", entries: buildNutritionEntries(nutritionProducts) },
    { name: "blog", entries: buildBlogEntries() },
    { name: "professionals", entries: buildMarketplaceEntries(marketplaceSnapshot) },
  ];

  assertUniqueSitemapEntries(sitemapFiles);

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
