import fs from "node:fs";
import path from "node:path";
import { getAllPosts } from "../lib/blog.ts";
import {
  getMarketplaceCategoryProfessionalCount,
  isPublicMarketplaceProfessional,
} from "../lib/marketplace-seo.ts";
import type {
  MarketplaceSnapshot,
  ProfessionalCategoryRecord,
} from "../lib/marketplace-types.ts";
import {
  buildRestaurantSummaries,
  getRestaurantSlugMap,
  type NutritionProduct,
} from "../lib/nutrition-data.ts";
import { absoluteUrl, normalizeSitePath } from "../lib/site.ts";
import {
  MARKETPLACE_FILTER_QUERY_KEYS,
  RETIRED_WORKOUT_REDIRECTS,
  type LegacyRedirect,
} from "../lib/legacy-routes.ts";
import { getLegacyToolPath, tools } from "../lib/tools.ts";
import {
  canonicalizeTrainingSnapshot,
  EXERCISE_EQUIPMENT_CATEGORIES,
  EXERCISE_MUSCLE_CATEGORIES,
  getExerciseSubstitutionCompatibilityScore,
  WORKOUT_GOALS,
  getNormalizedExerciseMovementPattern,
  getExerciseSubstitutions,
  getExercisesByCategorySlug,
  getWorkoutCanonicalIdentityKey,
  matchesPrimaryMuscleCategory,
  normalizeExerciseName,
  normalizeMuscleGroup,
  type ExerciseRecord,
  type TrainingDataSnapshot,
} from "../lib/training-data.ts";
import { getExerciseContentScore } from "../lib/training-seo.ts";

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, "out");
const publicDir = path.join(projectRoot, "public");
const sitemapIndexPath = fs.existsSync(path.join(outDir, "sitemap.xml"))
  ? path.join(outDir, "sitemap.xml")
  : path.join(publicDir, "sitemap.xml");
const trainingDataPath = path.join(projectRoot, ".generated", "training-data.json");
const nutritionDataPath = path.join(projectRoot, ".generated", "nutrition-data.json");
const marketplaceDataPath = path.join(projectRoot, ".generated", "marketplace-data.json");

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

function countPrimaryHeadings(html: string) {
  return [...html.matchAll(/<h1\b/gi)].length;
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

function duplicateMetadata(values: Array<{ url: string; value: string }>) {
  const urlsByValue = new Map<string, string[]>();

  for (const entry of values) {
    if (!entry.value) {
      continue;
    }

    const normalizedValue = entry.value.trim().toLowerCase();
    urlsByValue.set(normalizedValue, [...(urlsByValue.get(normalizedValue) ?? []), entry.url]);
  }

  return [...urlsByValue.entries()]
    .filter(([, urls]) => urls.length > 1)
    .map(([value, urls]) => `"${value}" -> ${urls.join(", ")}`);
}

function isClearlyRelevantSecondaryMatch(exercise: ExerciseRecord, categorySlug: string) {
  const normalizedCategory = normalizeMuscleGroup(categorySlug);
  const normalizedSecondaries = exercise.secondaryMuscleGroups
    .map((group) => normalizeMuscleGroup(group))
    .filter((group): group is string => group != null);

  return normalizedCategory === "glutes"
    && normalizedSecondaries.includes("glutes")
    && matchesPrimaryMuscleCategory(exercise, "legs")
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

function findLegacyLegalLinks() {
  const activeDirectories = ["app", "components", "content/blog", "lib"];
  const legacyPattern = /(?:^|["'(=])\/?(?:privacy-policy|terms-of-service)\.html(?:["')?#]|$)/gim;
  const matches: string[] = [];

  for (const directory of activeDirectories) {
    const directoryPath = path.join(projectRoot, directory);

    for (const filePath of walkSourceFiles(directoryPath)) {
      const source = fs.readFileSync(filePath, "utf8");

      if (legacyPattern.test(source)) {
        matches.push(path.relative(projectRoot, filePath));
      }

      legacyPattern.lastIndex = 0;
    }
  }

  return matches;
}

function main() {
  if (!fs.existsSync(outDir)) {
    throw new Error("Static export output is missing. Run `npm run build` before running the SEO audit.");
  }

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
  const duplicateSitemapEntries = slugDuplicates(childSitemapUrls).map(
    ([url, count]) => `${url} appears ${count} times`,
  );
  const hashedWorkoutUrlsInSitemap = canonicalPageUrls.filter((url) =>
    /\/workouts\/[a-z0-9-]+-[a-f0-9]{8}\/?$/i.test(new URL(url).pathname),
  );
  const vercelConfig = readJsonFile<{
    bulkRedirectsPath?: string;
    headers?: Array<{
      source: string;
      has?: Array<{ type: string; key: string }>;
      headers?: Array<{ key: string; value: string }>;
    }>;
  }>(path.join(projectRoot, "vercel.json"), {});
  const configuredRedirects = readJsonFile<LegacyRedirect[]>(
    path.join(projectRoot, vercelConfig.bulkRedirectsPath ?? "config/redirects.json"),
    [],
  );
  const redirectSources = new Set(
    configuredRedirects.map((redirect) => normalizeSitePath(redirect.source)),
  );
  const redirectUrlsInSitemap = canonicalPageUrls.filter((url) =>
    redirectSources.has(toSitePathFromUrl(url)),
  );
  const totalHtmlFiles = walkHtmlFiles(outDir).length;
  const allHtmlFiles = walkHtmlFiles(outDir);
  const retiredWorkoutPaths = new Set(
    RETIRED_WORKOUT_REDIRECTS.map((redirect) => normalizeSitePath(`/workouts/${redirect.sourceSlug}`)),
  );
  const legacyToolPaths = new Set(tools.map((tool) => normalizeSitePath(getLegacyToolPath(tool.slug))));
  legacyToolPaths.add(normalizeSitePath("/tools"));
  const retiredWorkoutStaticPages = RETIRED_WORKOUT_REDIRECTS
    .filter((redirect) => fs.existsSync(toOutputFile(normalizeSitePath(`/workouts/${redirect.sourceSlug}`))))
    .map((redirect) => redirect.sourceSlug);
  const legacyToolStaticPages = [
    "/tools",
    ...tools.map((tool) => getLegacyToolPath(tool.slug)),
  ]
    .filter((sitePath) => fs.existsSync(toOutputFile(normalizeSitePath(sitePath))));
  const retiredWorkoutInternalLinks: string[] = [];
  const legacyToolInternalLinks: string[] = [];

  for (const htmlPath of allHtmlFiles) {
    const html = fs.readFileSync(htmlPath, "utf8");
    const sourcePage = path.relative(outDir, htmlPath).replaceAll("\\", "/");

    for (const href of extractInternalLinks(html)) {
      if (retiredWorkoutPaths.has(href)) retiredWorkoutInternalLinks.push(`${sourcePage} -> ${href}`);
      if (legacyToolPaths.has(href)) legacyToolInternalLinks.push(`${sourcePage} -> ${href}`);
    }
  }
  const configuredFilterHeaders = new Set(
    (vercelConfig.headers ?? []).flatMap((entry) =>
      entry.has?.filter((condition) => condition.type === "query").flatMap((condition) => {
        const robotsHeader = entry.headers?.find((header) => header.key.toLowerCase() === "x-robots-tag");
        return robotsHeader?.value.toLowerCase() === "noindex, follow" ? [condition.key] : [];
      }) ?? [],
    ),
  );
  const missingMarketplaceFilterHeaders = MARKETPLACE_FILTER_QUERY_KEYS
    .filter((key) => !configuredFilterHeaders.has(key));

  const non200Urls = canonicalPageUrls.filter((url) => !fileExistsForUrl(url));
  const missingCanonical: string[] = [];
  const missingMetaTitle: string[] = [];
  const missingMetaDescription: string[] = [];
  const unexpectedNoindex: string[] = [];
  const multipleH1Pages: string[] = [];
  const linkGraph = new Map<string, string[]>();
  const pageTitles: Array<{ url: string; value: string }> = [];
  const pageDescriptions: Array<{ url: string; value: string }> = [];

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

    pageTitles.push({ url, value: title });
    pageDescriptions.push({ url, value: description });

    if (!canonical || canonical !== absoluteUrl(sitePath)) {
      missingCanonical.push(url);
    }

    if (robots.includes("noindex")) {
      unexpectedNoindex.push(url);
    }

    const h1Count = countPrimaryHeadings(html);

    if (h1Count !== 1) {
      multipleH1Pages.push(`${url} has ${h1Count} H1 elements`);
    }

    linkGraph.set(sitePath, extractInternalLinks(html));
  }

  const duplicateMetaTitles = duplicateMetadata(pageTitles);
  const duplicateMetaDescriptions = duplicateMetadata(pageDescriptions);

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

  const duplicateExerciseNames = slugDuplicates(trainingSnapshot.exercises.map((exercise) => normalizeExerciseName(exercise.name))).map(
    ([name, count]) => `exercise name "${name}" appears ${count} times after snapshot normalization`,
  );
  const duplicateWorkoutCanonicalIdentities = slugDuplicates(
    trainingSnapshot.workoutTemplates.map((workout) =>
      getWorkoutCanonicalIdentityKey(workout, trainingSnapshot.workoutTemplateExercises),
    ),
  ).map(([, count]) => `canonical workout identity appears ${count} times`);
  const legacyLegalLinks = findLegacyLegalLinks();

  const shortExerciseContent = trainingSnapshot.exercises
    .filter((exercise) => getExerciseContentScore(exercise) < 10)
    .map((exercise) => `${exercise.name} (${exercise.slug}) score=${getExerciseContentScore(exercise)}`);

  const categoryMismatches = EXERCISE_MUSCLE_CATEGORIES.flatMap((category) =>
    getExercisesByCategorySlug(trainingSnapshot.exercises, category.slug)
      .filter(
        (exercise) =>
          !matchesPrimaryMuscleCategory(exercise, category.slug) && !isClearlyRelevantSecondaryMatch(exercise, category.slug),
      )
      .map((exercise) => `${category.slug}: ${exercise.name} (${exercise.slug})`),
  );

  const categoryDuplicateIssues = [...EXERCISE_MUSCLE_CATEGORIES, ...EXERCISE_EQUIPMENT_CATEGORIES].flatMap((category) => {
    const categoryExercises = getExercisesByCategorySlug(trainingSnapshot.exercises, category.slug);
    const duplicateIds = slugDuplicates(categoryExercises.map((exercise) => exercise.id)).map(
      ([id, count]) => `${category.slug}: duplicate id ${id} rendered ${count} times`,
    );
    const duplicateCategorySlugs = slugDuplicates(categoryExercises.map((exercise) => exercise.slug)).map(
      ([slug, count]) => `${category.slug}: duplicate slug ${slug} rendered ${count} times`,
    );
    const duplicateNames = slugDuplicates(categoryExercises.map((exercise) => normalizeExerciseName(exercise.name))).map(
      ([name, count]) => `${category.slug}: duplicate name "${name}" rendered ${count} times`,
    );

    return [...duplicateIds, ...duplicateCategorySlugs, ...duplicateNames];
  });

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
    "/professionals/",
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

  const publicMarketplaceProfessionals = marketplaceSnapshot.professionals.filter(isPublicMarketplaceProfessional);
  const sitemapSitePaths = new Set(canonicalPageUrls.map((url) => toSitePathFromUrl(url)));
  const marketplaceCategoriesByPath = new Map<string, ProfessionalCategoryRecord>(
    marketplaceSnapshot.categories.map((category) => [
      normalizeSitePath(`/professionals/${category.slug}`),
      category,
    ]),
  );
  const emptyMarketplaceCategoriesInSitemap = [...marketplaceCategoriesByPath.entries()]
    .filter(
      ([sitePath, category]) =>
        sitemapSitePaths.has(sitePath)
        && getMarketplaceCategoryProfessionalCount(category, publicMarketplaceProfessionals) === 0,
    )
    .map(([sitePath]) => absoluteUrl(sitePath));
  const nonPublicMarketplaceProfilesInSitemap = marketplaceSnapshot.professionals
    .filter(
      (professional) =>
        !isPublicMarketplaceProfessional(professional)
        && sitemapSitePaths.has(normalizeSitePath(`/professionals/${professional.profileSlug}`)),
    )
    .map((professional) => professional.profileSlug);
  const publicMarketplaceProfilesMissingFromSitemap = publicMarketplaceProfessionals
    .filter(
      (professional) =>
        !sitemapSitePaths.has(normalizeSitePath(`/professionals/${professional.profileSlug}`)),
    )
    .map((professional) => professional.profileSlug);
  const privateMarketplaceFieldLeaks = publicMarketplaceProfessionals.flatMap((professional) => {
    const profileUrl = absoluteUrl(`/professionals/${professional.profileSlug}`);
    const html = readHtmlForUrl(profileUrl);

    if (!html) {
      return [];
    }

    return [
      "approvalStatus",
      "identityVerificationStatus",
      "lastSubmittedAt",
      "reviewFeedbackPublic",
      "userId",
    ]
      .filter((field) => html.includes(field))
      .map((field) => `${professional.profileSlug}: serialized private field ${field}`);
  });
  const marketplaceDirectoryHtml = readHtmlForUrl(absoluteUrl("/professionals/"));
  const marketplaceDirectoryRenderingIssues = [
    marketplaceDirectoryHtml?.includes("BAILOUT_TO_CLIENT_SIDE_RENDERING")
      ? "Directory export contains a client-side rendering bailout"
      : null,
    !marketplaceDirectoryHtml?.includes("Find the right support for your goals")
      ? "Directory H1 is missing from initial HTML"
      : null,
    !marketplaceSnapshot.categories.some((category) =>
      marketplaceDirectoryHtml?.includes(`/professionals/${category.slug}/`),
    )
      ? "Directory has no category links in initial HTML"
      : null,
  ].filter((issue): issue is string => issue != null);
  const marketplaceCategoryRenderingIssues = marketplaceSnapshot.categories.flatMap((category) => {
    const categoryUrl = absoluteUrl(`/professionals/${category.slug}`);
    const html = readHtmlForUrl(categoryUrl);
    const publicCount = getMarketplaceCategoryProfessionalCount(category, publicMarketplaceProfessionals);
    const robots = html ? extractRobots(html) : "";
    const issues: string[] = [];

    if (!html) {
      return [`${category.slug}: exported category page is missing`];
    }

    if (!html.includes(category.label)) {
      issues.push(`${category.slug}: category heading is missing from initial HTML`);
    }

    if (publicCount === 0 && !robots.includes("noindex")) {
      issues.push(`${category.slug}: empty category should be noindex`);
    }

    if (publicCount > 0 && robots.includes("noindex")) {
      issues.push(`${category.slug}: populated category should be indexable`);
    }

    return issues;
  });
  const marketplaceProfileRenderingIssues = publicMarketplaceProfessionals.flatMap((professional) => {
    const profileUrl = absoluteUrl(`/professionals/${professional.profileSlug}`);
    const html = readHtmlForUrl(profileUrl);

    if (!html) {
      return [`${professional.profileSlug}: exported profile page is missing`];
    }

    const issues: string[] = [];

    if (!html.includes(professional.displayName)) {
      issues.push(`${professional.profileSlug}: profile name is missing from initial HTML`);
    }

    if (extractCanonical(html) !== profileUrl) {
      issues.push(`${professional.profileSlug}: canonical does not match public profile URL`);
    }

    if (extractRobots(html).includes("noindex")) {
      issues.push(`${professional.profileSlug}: eligible public profile is noindex`);
    }

    return issues;
  });

  console.log("SEO Audit Summary");
  console.log("-----------------");
  console.log(`Total exported HTML pages: ${totalHtmlFiles}`);
  console.log(`Sitemap files discovered: ${sitemapUrls.length}`);
  console.log(`Sitemap URLs discovered: ${canonicalPageUrls.length}`);
  console.log(`URLs returning non-200 in static export: ${non200Urls.length}`);
  console.log(`Eligible public marketplace profiles: ${publicMarketplaceProfessionals.length}`);

  printSection("Duplicate slugs", duplicateSlugs);
  printSection("Duplicate workout canonical identities", duplicateWorkoutCanonicalIdentities);
  printSection("Duplicate sitemap entries", duplicateSitemapEntries);
  printSection("Hashed workout URLs in sitemap", hashedWorkoutUrlsInSitemap);
  printSection("Known redirect URLs in sitemap", redirectUrlsInSitemap);
  printSection("Retired workout static pages", retiredWorkoutStaticPages);
  printSection("Retired workout internal links", retiredWorkoutInternalLinks.slice(0, 50));
  printSection("Legacy tool static pages", legacyToolStaticPages);
  printSection("Legacy tool internal links", legacyToolInternalLinks.slice(0, 50));
  printSection("Missing filtered marketplace header rules", missingMarketplaceFilterHeaders);
  printSection("Legacy legal links in active source", legacyLegalLinks);
  printSection("Duplicate exercise names", duplicateExerciseNames.slice(0, 50));
  printSection("Duplicate meta titles", duplicateMetaTitles.slice(0, 25));
  printSection("Duplicate meta descriptions", duplicateMetaDescriptions.slice(0, 25));
  printSection("Missing canonical", missingCanonical.slice(0, 25));
  printSection("Missing meta title", missingMetaTitle.slice(0, 25));
  printSection("Missing meta description", missingMetaDescription.slice(0, 25));
  printSection("Unexpected noindex pages", unexpectedNoindex.slice(0, 25));
  printSection("Pages without exactly one H1", multipleH1Pages.slice(0, 50));
  printSection("Exercise pages with very short content", shortExerciseContent.slice(0, 50));
  printSection("Bench press classification issues", benchPressClassificationIssues.slice(0, 50));
  printSection("Category mismatches", categoryMismatches.slice(0, 50));
  printSection("Category pages with duplicate exercise cards", categoryDuplicateIssues.slice(0, 50));
  printSection("Workout substitutions with mismatched muscle groups", substitutionMismatches.slice(0, 50));
  printSection("Incompatible named exercise alternatives", incompatibleNamedAlternatives.slice(0, 50));
  printSection("Pressing movements pointing to arm-isolation alternatives", pressingToArmIsolationIssues.slice(0, 50));
  printSection("Bench Press-Focused Workout substitution issues", benchWorkoutSubstitutionIssues.slice(0, 50));
  printSection("Pages not linked from any hub", pagesNotLinkedFromHub.slice(0, 50));
  printSection("Unknown restaurant slugs", unknownRestaurantSlugs);
  printSection("Empty marketplace category pages in sitemap", emptyMarketplaceCategoriesInSitemap);
  printSection("Non-public marketplace profiles in sitemap", nonPublicMarketplaceProfilesInSitemap);
  printSection("Public marketplace profiles missing from sitemap", publicMarketplaceProfilesMissingFromSitemap);
  printSection("Private marketplace fields serialized into public profile pages", privateMarketplaceFieldLeaks);
  printSection("Marketplace directory rendering issues", marketplaceDirectoryRenderingIssues);
  printSection("Marketplace category rendering issues", marketplaceCategoryRenderingIssues);
  printSection("Marketplace profile rendering issues", marketplaceProfileRenderingIssues);

  const criticalIssueCount = [
    non200Urls,
    missingCanonical,
    missingMetaTitle,
    missingMetaDescription,
    duplicateWorkoutCanonicalIdentities,
    duplicateSitemapEntries,
    hashedWorkoutUrlsInSitemap,
    redirectUrlsInSitemap,
    retiredWorkoutStaticPages,
    retiredWorkoutInternalLinks,
    legacyToolStaticPages,
    legacyToolInternalLinks,
    missingMarketplaceFilterHeaders,
    legacyLegalLinks,
    multipleH1Pages,
  ].reduce((total, issues) => total + issues.length, 0);

  if (criticalIssueCount > 0) {
    process.exitCode = 1;
  }
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

function walkSourceFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(fullPath));
      continue;
    }

    if (entry.isFile() && /\.(?:ts|tsx|js|jsx|md|mdx|html)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

main();
