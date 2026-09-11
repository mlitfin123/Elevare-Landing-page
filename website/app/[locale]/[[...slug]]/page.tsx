import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalizedHomePage } from "@/components/localization/LocalizedHomePage";
import { LocalizedExercisesPage } from "@/components/localization/LocalizedExercisesPage";
import { LocalizedCalculatorsPage } from "@/components/localization/LocalizedCalculatorsPage";
import { LocalizedNutritionPage } from "@/components/localization/LocalizedNutritionPage";
import { LocalizedWorkoutsPage } from "@/components/localization/LocalizedWorkoutsPage";
import { LocalizedWorkoutGeneratorPage } from "@/components/localization/LocalizedWorkoutGeneratorPage";
import { LocalizedProductPage } from "@/components/localization/LocalizedProductPage";
import { LocalizedQuickAnalysisPage } from "@/components/localization/LocalizedQuickAnalysisPage";
import { LocalizedStageAnalysisPage } from "@/components/localization/LocalizedStageAnalysisPage";
import { QuickAnalysisResultExperience } from "@/components/quick-analysis/QuickAnalysisResultExperience";
import { CompleteStageAnalysisResultExperience } from "@/components/stage-analysis/CompleteStageAnalysisResultExperience";
import { PosingAnalysisResultExperience } from "@/components/stage-analysis/PosingAnalysisResultExperience";
import { Suspense } from "react";
import { MarketplaceDirectory } from "@/components/marketplace/MarketplaceDirectory";
import { MarketplaceAccountShell } from "@/components/marketplace/MarketplaceAccountShell";
import { AccountDashboard } from "@/components/marketplace/AccountDashboard";
import { ProfessionalProfileEditor } from "@/components/marketplace/ProfessionalProfileEditor";
import { ProfessionalInquiriesPanel } from "@/components/marketplace/ProfessionalInquiriesPanel";
import { ConciergeCasesPanel } from "@/components/marketplace/ConciergeCasesPanel";
import { ProfessionalOpportunitiesPanel } from "@/components/marketplace/ProfessionalOpportunitiesPanel";
import { TrustSafetyPageContent } from "@/components/marketplace/TrustSafetyPageContent";
import { StructuredData } from "@/components/StructuredData";
import {
  LocalizedProfessionalRoutePage,
  buildProfessionalRouteMetadata,
} from "@/app/professionals/[slug]/page";
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
import { getStageAnalysisMessages } from "@/lib/i18n/stage-analysis-messages";
import { getWorkoutMessages, localizeWorkoutGoal, localizeWorkoutName } from "@/lib/i18n/workout-content";
import { getWorkoutGeneratorMessages } from "@/lib/i18n/workout-generator-content";
import { getNutritionRestaurants, getRestaurantBySlug } from "@/lib/nutrition";
import { fastFoodNutritionViews, isFastFoodNutritionView, isRestaurantNutritionView, restaurantNutritionViews } from "@/lib/nutrition-pages";
import { absoluteUrl, buildMetadata } from "@/lib/site";
import { getAllExercises, getAllWorkoutTemplates, getExerciseBySlug, getWorkoutTemplateBySlug } from "@/lib/training";
import { EXERCISE_EQUIPMENT_CATEGORIES, EXERCISE_MUSCLE_CATEGORIES, getExerciseCategoryInfo, getWorkoutGoalInfo, WORKOUT_GOALS } from "@/lib/training-data";
import { getTool, tools } from "@/lib/tools";
import { getMarketplaceCategories, getMarketplaceProfessionals } from "@/lib/marketplace";
import { findTopCategories, getMarketplaceRotationSeed, toProfessionalDirectoryRecords } from "@/lib/marketplace-helpers";
import { hasMarketplaceFilterSearchParams } from "@/lib/marketplace-seo";
import { localizeMarketplaceCategory, marketplaceText } from "@/lib/i18n/marketplace-content";

type LocalizedPageParams = {
  locale: string;
  slug?: string[];
};

export const dynamicParams = true;

export async function generateStaticParams() {
  const baseParams = getLocalizedRouteParams();
  if (!baseParams.length) return [];

  const [exercises, workoutTemplates, restaurants, marketplaceCategories] = await Promise.all([getAllExercises(), getAllWorkoutTemplates(), getNutritionRestaurants(), getMarketplaceCategories()]);
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
      { locale: localeSegment, slug: ["professionals"] },
      ...marketplaceCategories.map((category) => ({ locale: localeSegment, slug: ["professionals", category.slug] })),
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
  if (slug.length === 2 && slug[0] === "stagelab" && slug[1] === "posing-analysis") {
    return { locale, page: "posing-analysis" as const, pathname: "/stagelab/posing-analysis/" };
  }
  if (slug.length === 3 && slug[0] === "stagelab" && slug[1] === "posing-analysis" && slug[2] === "result") {
    return { locale, page: "posing-analysis-result" as const, pathname: "/stagelab/posing-analysis/result/" };
  }
  if (slug.length === 2 && slug[0] === "stagelab" && slug[1] === "complete-stage-analysis") {
    return { locale, page: "complete-stage-analysis" as const, pathname: "/stagelab/complete-stage-analysis/" };
  }
  if (slug.length === 3 && slug[0] === "stagelab" && slug[1] === "complete-stage-analysis" && slug[2] === "result") {
    return { locale, page: "complete-stage-analysis-result" as const, pathname: "/stagelab/complete-stage-analysis/result/" };
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
  if (slug.length === 2 && slug[0] === "tools" && slug[1] === "workout-generator") {
    return { locale, page: "workout-generator" as const, pathname: "/tools/workout-generator/" };
  }
  if (slug.length === 1 && slug[0] === "trust-safety") {
    return { locale, page: "trust-safety" as const, pathname: "/trust-safety/" };
  }
  if (slug[0] === "nutrition" && slug.length <= 3) {
    return { locale, page: "nutrition" as const, pathname: `/${slug.join("/")}/`, catalogSegments: slug.slice(1) };
  }
  if (slug[0] === "professionals" && slug.length <= 2) {
    return { locale, page: "professionals" as const, pathname: `/${slug.join("/")}/`, catalogSlug: slug[1] };
  }
  if (slug.length === 1 && slug[0] === "account") {
    return { locale, page: "account" as const, pathname: "/account/" };
  }
  if (slug.length === 2 && slug[0] === "account" && slug[1] === "professional-profile") {
    return { locale, page: "professional-account" as const, pathname: "/account/professional-profile/" };
  }
  if (slug.length === 2 && slug[0] === "account" && slug[1] === "inquiries") {
    return { locale, page: "account-inquiries" as const, pathname: "/account/inquiries/" };
  }
  if (slug.length === 2 && slug[0] === "account" && slug[1] === "client-requests") {
    return { locale, page: "professional-inquiries" as const, pathname: "/account/client-requests/" };
  }
  if (slug.length === 2 && slug[0] === "account" && slug[1] === "matches") {
    return { locale, page: "concierge-matches" as const, pathname: "/account/matches/" };
  }
  if (slug.length === 2 && slug[0] === "account" && slug[1] === "opportunities") {
    return { locale, page: "concierge-opportunities" as const, pathname: "/account/opportunities/" };
  }
  return null;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<LocalizedPageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const resolved = resolvePage(await params);
  if (!resolved || !areLocalizedRoutesEnabled()) return {};

  const indexingEnabled = isLocalizedIndexingEnabled();
  if (resolved.page === "professionals") {
    const filteredSearch = hasMarketplaceFilterSearchParams(await searchParams);
    if (resolved.catalogSlug) return buildProfessionalRouteMetadata(resolved.catalogSlug, resolved.locale, filteredSearch);
    const t = (value: string) => marketplaceText(resolved.locale, value);
    return buildMetadata({
      title: t("Find Trainers, Coaches & Wellness Experts | Elevare"),
      description: t("Explore personal trainers, nutrition coaches, bodybuilding coaches, wellness specialists, and other fitness and health-focused services on Elevare."),
      pathname: localizePathname("/professionals/", resolved.locale),
      locale: resolved.locale,
      localizedAlternates: true,
      robots: filteredSearch
        ? { index: false, follow: true }
        : indexingEnabled
          ? undefined
          : { index: false, follow: false },
    });
  }

  if (resolved.page === "trust-safety") {
    return buildMetadata({
      title: marketplaceText(resolved.locale, "Trust and Safety | Elevare Professional Marketplace"),
      description: marketplaceText(resolved.locale, "Learn what Elevare reviews, what marketplace trust statuses mean, and how to evaluate and report concerns about independent professionals."),
      pathname: localizePathname("/trust-safety/", resolved.locale),
      locale: resolved.locale,
      localizedAlternates: true,
      robots: indexingEnabled ? undefined : { index: false, follow: false },
    });
  }

  if (
    resolved.page === "account"
    || resolved.page === "professional-account"
    || resolved.page === "account-inquiries"
    || resolved.page === "professional-inquiries"
    || resolved.page === "concierge-matches"
    || resolved.page === "concierge-opportunities"
  ) {
    return buildMetadata({
      title: marketplaceText(
        resolved.locale,
        resolved.page === "account"
          ? "Your Elevare account"
          : resolved.page === "account-inquiries"
            ? "My Requests"
            : resolved.page === "professional-inquiries"
              ? "Client Requests"
              : resolved.page === "concierge-matches"
                ? "Concierge Matches"
                : resolved.page === "concierge-opportunities"
                  ? "Match Opportunities"
              : "Your Pro Profile",
      ),
      description: marketplaceText(resolved.locale, "Manage your Elevare account and professional profile."),
      pathname: localizePathname(resolved.pathname, resolved.locale),
      locale: resolved.locale,
      localizedAlternates: true,
      robots: { index: false, follow: false },
    });
  }
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

  if (resolved.page === "workout-generator") {
    const messages = getWorkoutGeneratorMessages(resolved.locale);
    return buildMetadata({
      title: messages.seo.title,
      description: messages.seo.description,
      pathname: localizePathname(resolved.pathname, resolved.locale),
      locale: resolved.locale,
      localizedAlternates: true,
      robots: indexingEnabled ? undefined : { index: false, follow: false },
    });
  }

  if (
    resolved.page === "posing-analysis" ||
    resolved.page === "posing-analysis-result" ||
    resolved.page === "complete-stage-analysis" ||
    resolved.page === "complete-stage-analysis-result"
  ) {
    const messages = getStageAnalysisMessages(resolved.locale);
    const product = resolved.page.startsWith("posing-") ? "posing_analysis" : "complete_stage_analysis";
    const isResult = resolved.page.endsWith("-result");
    const metadata = buildMetadata({
      title: isResult
        ? product === "posing_analysis" ? messages.result.reportTitle : messages.result.completeTitle
        : messages.seo[product].title,
      description: messages.seo[product].description,
      pathname: localizePathname(resolved.pathname, resolved.locale),
      locale: resolved.locale,
      localizedAlternates: true,
      robots: isResult
        ? { index: false, follow: false, noarchive: true, nosnippet: true }
        : indexingEnabled ? undefined : { index: false, follow: false },
    });
    return isResult ? { ...metadata, referrer: "no-referrer" } : metadata;
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

  if (resolved.page === "workout-generator") {
    return <LocalizedWorkoutGeneratorPage locale={resolved.locale} />;
  }

  if (resolved.page === "professionals") {
    if (resolved.catalogSlug) {
      return <LocalizedProfessionalRoutePage slug={resolved.catalogSlug} locale={resolved.locale} />;
    }

    const [categories, professionals] = await Promise.all([getMarketplaceCategories(), getMarketplaceProfessionals()]);
    const topCategories = findTopCategories(categories, professionals, 8);
    const directoryProfessionals = toProfessionalDirectoryRecords(professionals);
    const localizedCategories = topCategories.map((category) => localizeMarketplaceCategory(category, resolved.locale));
    const directoryPath = localizePathname("/professionals/", resolved.locale);
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: marketplaceText(resolved.locale, "Find the right support for your goals."),
      url: absoluteUrl(directoryPath),
      inLanguage: resolved.locale,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: localizedCategories.map((category, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: category.label,
          url: absoluteUrl(localizePathname(`/professionals/${category.slug}/`, resolved.locale)),
        })),
      },
    };
    return (
      <div className="container">
        <StructuredData data={structuredData} />
        <Suspense fallback={null}>
          <MarketplaceDirectory categories={categories} professionals={directoryProfessionals} sourcePage={`professionals_index_${resolved.locale}`} topCategories={topCategories} rotationSeed={getMarketplaceRotationSeed(`professionals-index-${resolved.locale}`)} showMobileAppSection />
        </Suspense>
      </div>
    );
  }

  if (resolved.page === "trust-safety") {
    return <TrustSafetyPageContent locale={resolved.locale} />;
  }

  if (
    resolved.page === "account"
    || resolved.page === "professional-account"
    || resolved.page === "account-inquiries"
    || resolved.page === "professional-inquiries"
    || resolved.page === "concierge-matches"
    || resolved.page === "concierge-opportunities"
  ) {
    return (
      <div className="container">
        <MarketplaceAccountShell>
          {resolved.page === "account" ? <AccountDashboard /> : null}
          {resolved.page === "professional-account" ? <ProfessionalProfileEditor /> : null}
          {resolved.page === "account-inquiries" ? <ProfessionalInquiriesPanel /> : null}
          {resolved.page === "professional-inquiries" ? <ProfessionalInquiriesPanel mode="received" /> : null}
          {resolved.page === "concierge-matches" ? <ConciergeCasesPanel /> : null}
          {resolved.page === "concierge-opportunities" ? <ProfessionalOpportunitiesPanel /> : null}
        </MarketplaceAccountShell>
      </div>
    );
  }

  const messages = await getMarketingMessages(resolved.locale);
  const quickAnalysisMessages = getQuickAnalysisMessages(resolved.locale);
  const stageAnalysisMessages = getStageAnalysisMessages(resolved.locale);

  if (resolved.page === "home") {
    return <LocalizedHomePage locale={resolved.locale} messages={messages.home} />;
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

  if (resolved.page === "posing-analysis") {
    return <LocalizedStageAnalysisPage product="posing_analysis" locale={resolved.locale} messages={stageAnalysisMessages} />;
  }

  if (resolved.page === "complete-stage-analysis") {
    return <LocalizedStageAnalysisPage product="complete_stage_analysis" locale={resolved.locale} messages={stageAnalysisMessages} />;
  }

  if (resolved.page === "posing-analysis-result") {
    return (
      <div className="container">
        <Suspense fallback={<section className="quick-analysis-state panel"><h1>{stageAnalysisMessages.result.opening}</h1></section>}>
          <PosingAnalysisResultExperience product="posing_analysis" locale={resolved.locale} messages={stageAnalysisMessages.result} />
        </Suspense>
      </div>
    );
  }

  if (resolved.page === "complete-stage-analysis-result") {
    return (
      <div className="container">
        <Suspense fallback={<section className="quick-analysis-state panel"><h1>{stageAnalysisMessages.result.opening}</h1></section>}>
          <CompleteStageAnalysisResultExperience locale={resolved.locale} quickMessages={quickAnalysisMessages.result} stageMessages={stageAnalysisMessages.result} />
        </Suspense>
      </div>
    );
  }

  return <LocalizedProductPage locale={resolved.locale} product={resolved.page} messages={messages.products[resolved.page]} />;
}
