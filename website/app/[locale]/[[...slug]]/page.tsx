import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalizedHomePage } from "@/components/localization/LocalizedHomePage";
import { LocalizedExercisesPage } from "@/components/localization/LocalizedExercisesPage";
import { LocalizedCalculatorsPage } from "@/components/localization/LocalizedCalculatorsPage";
import { LocalizedNutritionPage } from "@/components/localization/LocalizedNutritionPage";
import { LocalizedWorkoutsPage } from "@/components/localization/LocalizedWorkoutsPage";
import { LocalizedProductPage } from "@/components/localization/LocalizedProductPage";
import { LocalizedQuickAnalysisPage } from "@/components/localization/LocalizedQuickAnalysisPage";
import { QuickAnalysisResultExperience } from "@/components/quick-analysis/QuickAnalysisResultExperience";
import { Suspense } from "react";
import {
  areLocalizedRoutesEnabled,
  getLocalizedRouteParams,
  isLocalizedIndexingEnabled,
  localeFromSegment,
  localeToSegment,
  localizePathname,
} from "@/lib/i18n/config";
import { getCatalogMessages } from "@/lib/i18n/catalog-messages";
import { getCalculatorMessages } from "@/lib/i18n/calculator-messages";
import { getLocalizedTool } from "@/lib/i18n/calculator-content";
import { localizeExerciseName, localizeEquipmentLabel, localizeMuscleLabel } from "@/lib/i18n/catalog-content";
import { getMarketingMessages } from "@/lib/i18n/messages";
import { getQuickAnalysisMessages } from "@/lib/i18n/quick-analysis-messages";
import { getWorkoutMessages, localizeWorkoutGoal, localizeWorkoutName } from "@/lib/i18n/workout-content";
import { getNutritionRestaurants, getRestaurantBySlug } from "@/lib/nutrition";
import { fastFoodNutritionViews, isFastFoodNutritionView, isRestaurantNutritionView, restaurantNutritionViews } from "@/lib/nutrition-pages";
import { buildMetadata } from "@/lib/site";
import { getAllExercises, getAllWorkoutTemplates, getExerciseBySlug, getWorkoutTemplateBySlug } from "@/lib/training";
import { EXERCISE_EQUIPMENT_CATEGORIES, EXERCISE_MUSCLE_CATEGORIES, getExerciseCategoryInfo, getWorkoutGoalInfo, WORKOUT_GOALS } from "@/lib/training-data";
import { getTool, tools } from "@/lib/tools";

type LocalizedPageParams = {
  locale: string;
  slug?: string[];
};

export const dynamicParams = false;

export async function generateStaticParams() {
  const baseParams = getLocalizedRouteParams();
  if (!baseParams.length) return [];

  const [exercises, workoutTemplates, restaurants] = await Promise.all([getAllExercises(), getAllWorkoutTemplates(), getNutritionRestaurants()]);
  const categorySlugs = [...EXERCISE_MUSCLE_CATEGORIES, ...EXERCISE_EQUIPMENT_CATEGORIES].map((category) => category.slug);
  const locales = ["es-419", "pt-BR"] as const;
  const catalogParams = locales.flatMap((locale) => {
    const localeSegment = localeToSegment(locale);
    return [
      { locale: localeSegment, slug: ["exercises"] },
      ...categorySlugs.map((slug) => ({ locale: localeSegment, slug: ["exercises", slug] })),
      ...exercises.map((exercise) => ({ locale: localeSegment, slug: ["exercises", exercise.slug] })),
      { locale: localeSegment, slug: ["workouts"] },
      ...WORKOUT_GOALS.map((goal) => ({ locale: localeSegment, slug: ["workouts", goal.slug] })),
      ...workoutTemplates.map((template) => ({ locale: localeSegment, slug: ["workouts", template.slug] })),
      { locale: localeSegment, slug: ["calculators"] },
      ...tools.map((tool) => ({ locale: localeSegment, slug: ["calculators", tool.slug] })),
      { locale: localeSegment, slug: ["nutrition"] },
      { locale: localeSegment, slug: ["nutrition", "methodology"] },
      ...fastFoodNutritionViews.map((view) => ({ locale: localeSegment, slug: ["nutrition", "fast-food", view] })),
      ...restaurants.flatMap((restaurant) => [
        { locale: localeSegment, slug: ["nutrition", restaurant.slug] },
        ...restaurantNutritionViews.map((view) => ({ locale: localeSegment, slug: ["nutrition", restaurant.slug, view] })),
      ]),
    ];
  });

  return [...baseParams, ...catalogParams];
}

function resolvePage(params: LocalizedPageParams) {
  const locale = localeFromSegment(params.locale);
  const slug = params.slug ?? [];

  if (!locale || locale === "en") return null;
  if (slug.length === 0) return { locale, page: "home" as const, pathname: "/" };
  if (slug.length === 1 && slug[0] === "logbook") return { locale, page: "logbook" as const, pathname: "/logbook/" };
  if (slug.length === 1 && slug[0] === "stagelab") return { locale, page: "stagelab" as const, pathname: "/stagelab/" };
  if (slug.length === 2 && slug[0] === "stagelab" && slug[1] === "quick-analysis") {
    return { locale, page: "quick-analysis" as const, pathname: "/stagelab/quick-analysis/" };
  }
  if (slug.length === 3 && slug[0] === "stagelab" && slug[1] === "quick-analysis" && slug[2] === "result") {
    return { locale, page: "quick-analysis-result" as const, pathname: "/stagelab/quick-analysis/result/" };
  }
  if (slug[0] === "exercises" && slug.length <= 2) {
    return { locale, page: "exercises" as const, pathname: `/${slug.join("/")}/`, catalogSlug: slug[1] };
  }
  if (slug[0] === "workouts" && slug.length <= 2) {
    return { locale, page: "workouts" as const, pathname: `/${slug.join("/")}/`, catalogSlug: slug[1] };
  }
  if (slug[0] === "calculators" && slug.length <= 2) {
    return { locale, page: "calculators" as const, pathname: `/${slug.join("/")}/`, catalogSlug: slug[1] };
  }
  if (slug[0] === "nutrition" && slug.length <= 3) {
    return { locale, page: "nutrition" as const, pathname: `/${slug.join("/")}/`, catalogSegments: slug.slice(1) };
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<LocalizedPageParams> }): Promise<Metadata> {
  const resolved = resolvePage(await params);
  if (!resolved || !areLocalizedRoutesEnabled()) return {};

  const indexingEnabled = isLocalizedIndexingEnabled();
  if (resolved.page === "exercises") {
    const messages = getCatalogMessages(resolved.locale).exercise;
    const exercise = resolved.catalogSlug ? await getExerciseBySlug(resolved.catalogSlug) : null;
    const category = resolved.catalogSlug ? getExerciseCategoryInfo(resolved.catalogSlug) : null;
    const categoryLabel = category
      ? category.kind === "muscle"
        ? localizeMuscleLabel(category.slug, resolved.locale)
        : localizeEquipmentLabel(category.slug, resolved.locale)
      : null;
    const name = exercise ? localizeExerciseName(exercise.name, resolved.locale) : null;
    return buildMetadata({
      title: name
        ? messages.seo.detailTitle.replace("{name}", name)
        : categoryLabel
          ? `${categoryLabel}: ${messages.seo.categoryFallbackTitle}`
          : messages.seo.indexTitle,
      description: name
        ? messages.seo.detailDescription.replaceAll("{name}", name)
        : categoryLabel
          ? `${messages.seo.categoryFallbackDescription} ${categoryLabel}.`
          : messages.seo.indexDescription,
      pathname: localizePathname(resolved.pathname, resolved.locale),
      locale: resolved.locale,
      localizedAlternates: true,
      robots: indexingEnabled ? undefined : { index: false, follow: false },
    });
  }

  if (resolved.page === "nutrition") {
    const messages = getCatalogMessages(resolved.locale).nutrition;
    const [first, second] = resolved.catalogSegments;
    let title = messages.seo.indexTitle;
    let description = messages.seo.indexDescription;
    if (first === "methodology") {
      title = messages.seo.methodologyTitle;
      description = messages.seo.methodologyDescription;
    } else if (first === "fast-food" && second && isFastFoodNutritionView(second)) {
      const view = messages.explorer.variants[second] ?? second;
      title = `${messages.variant.fastFoodEyebrow}: ${view}`;
      description = `${messages.variant.fastFoodGuidesCopy} ${view}.`;
    } else if (first) {
      const restaurant = await getRestaurantBySlug(first);
      if (!restaurant || (second && !isRestaurantNutritionView(second))) return {};
      const view = second ? messages.explorer.variants[second] ?? second : null;
      title = view
        ? `${restaurant.summary.name}: ${view}`
        : messages.seo.restaurantTitle.replace("{restaurant}", restaurant.summary.name);
      description = view
        ? `${messages.restaurant.intro.replace("{restaurant}", restaurant.summary.name)} ${view}.`
        : messages.seo.restaurantDescription.replace("{restaurant}", restaurant.summary.name);
    }
    return buildMetadata({
      title,
      description,
      pathname: localizePathname(resolved.pathname, resolved.locale),
      locale: resolved.locale,
      localizedAlternates: true,
      robots: indexingEnabled ? undefined : { index: false, follow: false },
    });
  }

  if (resolved.page === "workouts") {
    const messages = getWorkoutMessages(resolved.locale);
    const workoutTemplate = resolved.catalogSlug ? await getWorkoutTemplateBySlug(resolved.catalogSlug) : null;
    const canonicalGoal = resolved.catalogSlug ? getWorkoutGoalInfo(resolved.catalogSlug) : null;
    const goal = canonicalGoal ? localizeWorkoutGoal(canonicalGoal, resolved.locale) : null;
    const name = workoutTemplate ? localizeWorkoutName(workoutTemplate.name, resolved.locale) : null;
    return buildMetadata({
      title: name
        ? messages.seo.detailTitle.replace("{name}", name)
        : goal?.title ?? messages.seo.indexTitle,
      description: name
        ? messages.seo.detailDescription.replace("{name}", name)
        : goal?.description ?? messages.seo.indexDescription,
      pathname: localizePathname(resolved.pathname, resolved.locale),
      locale: resolved.locale,
      localizedAlternates: true,
      robots: indexingEnabled ? undefined : { index: false, follow: false },
    });
  }

  if (resolved.page === "calculators") {
    const messages = getCalculatorMessages(resolved.locale);
    const tool = resolved.catalogSlug ? getTool(resolved.catalogSlug) : null;
    if (resolved.catalogSlug && !tool) return {};
    const localizedTool = tool ? getLocalizedTool(tool.slug, resolved.locale) : null;
    return buildMetadata({
      title: localizedTool?.title ?? messages.seo.indexTitle,
      description: localizedTool?.metaDescription ?? messages.seo.indexDescription,
      pathname: localizePathname(resolved.pathname, resolved.locale),
      locale: resolved.locale,
      localizedAlternates: true,
      robots: indexingEnabled ? undefined : { index: false, follow: false },
    });
  }

  const quickAnalysisMessages = getQuickAnalysisMessages(resolved.locale);
  const messages = await getMarketingMessages(resolved.locale);
  const seo = resolved.page === "home"
    ? messages.home.seo
    : resolved.page === "logbook" || resolved.page === "stagelab"
      ? messages.products[resolved.page].seo
      : resolved.page === "quick-analysis"
        ? quickAnalysisMessages.seo
        : { title: quickAnalysisMessages.result.seoTitle, description: quickAnalysisMessages.result.seoDescription };
  const pathname = localizePathname(resolved.pathname, resolved.locale);
  const metadata = buildMetadata({
    title: seo.title,
    description: seo.description,
    pathname,
    locale: resolved.locale,
    localizedAlternates: true,
    robots: resolved.page === "quick-analysis-result"
      ? { index: false, follow: false, noarchive: true, nosnippet: true }
      : indexingEnabled ? undefined : { index: false, follow: false },
  });

  return resolved.page === "quick-analysis-result"
    ? { ...metadata, referrer: "no-referrer" }
    : metadata;
}

export default async function LocalizedMarketingRoute({ params }: { params: Promise<LocalizedPageParams> }) {
  const resolved = resolvePage(await params);
  if (!resolved || !areLocalizedRoutesEnabled()) notFound();

  if (resolved.page === "exercises") {
    return <LocalizedExercisesPage locale={resolved.locale} slug={resolved.catalogSlug} />;
  }

  if (resolved.page === "nutrition") {
    return <LocalizedNutritionPage locale={resolved.locale} segments={resolved.catalogSegments} />;
  }

  if (resolved.page === "workouts") {
    return <LocalizedWorkoutsPage locale={resolved.locale} slug={resolved.catalogSlug} />;
  }

  if (resolved.page === "calculators") {
    return <LocalizedCalculatorsPage locale={resolved.locale} slug={resolved.catalogSlug} />;
  }

  const messages = await getMarketingMessages(resolved.locale);
  const quickAnalysisMessages = getQuickAnalysisMessages(resolved.locale);

  if (resolved.page === "home") {
    return <LocalizedHomePage locale={resolved.locale} messages={messages.home} categoryTranslations={messages.marketplaceCategories} />;
  }

  if (resolved.page === "quick-analysis") {
    return <LocalizedQuickAnalysisPage locale={resolved.locale} messages={quickAnalysisMessages} />;
  }

  if (resolved.page === "quick-analysis-result") {
    return (
      <div className="container">
        <Suspense fallback={<section className="quick-analysis-state panel"><h1>{quickAnalysisMessages.result.opening}</h1></section>}>
          <QuickAnalysisResultExperience locale={resolved.locale} messages={quickAnalysisMessages.result} />
        </Suspense>
      </div>
    );
  }

  return <LocalizedProductPage locale={resolved.locale} product={resolved.page} messages={messages.products[resolved.page]} />;
}
