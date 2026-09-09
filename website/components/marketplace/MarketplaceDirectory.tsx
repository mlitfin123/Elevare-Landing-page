"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ElevareMobileAppSection } from "@/components/marketplace/ElevareMobileAppSection";
import { usePathname, useRouter } from "next/navigation";
import { MarketplaceDemandForm } from "@/components/marketplace/MarketplaceDemandForm";
import { ProfessionalCard } from "@/components/marketplace/ProfessionalCard";
import { TrackedLink } from "@/components/TrackedLink";
import { trackEvent } from "@/lib/analytics";
import { isMarketplaceFilteredSearch } from "@/lib/marketplace-seo";
import {
  buildProfessionalFallbackGroups,
  filterProfessionals,
  getCategoryBySlug,
  getUniqueLocations,
  hasMeaningfulMarketplaceSearch,
  normalizeMarketplaceText,
  selectMarketplaceCategoryCards,
  sortProfessionals,
  sortProfessionalsWithRandomizedTies,
  type ProfessionalDirectoryFilters,
} from "@/lib/marketplace-helpers";
import {
  getMarketplaceTaxonomyCategoryByPublicSlug,
  MARKETPLACE_TAXONOMY_CATEGORIES,
} from "@/lib/marketplace-taxonomy";
import type { ProfessionalCategoryRecord, ProfessionalProfileRecord } from "@/lib/marketplace-types";
import { localeFromPathname, localizePathname } from "@/lib/i18n/config";
import {
  localizeMarketplaceCategory,
  localizeMarketplaceSpecialty,
  localizeProfessionalPath,
  marketplaceText,
} from "@/lib/i18n/marketplace-content";

type MarketplaceDirectoryProps = {
  categories: ProfessionalCategoryRecord[];
  professionals: ProfessionalProfileRecord[];
  sourcePage: string;
  fixedCategorySlug?: string;
  topCategories?: ProfessionalCategoryRecord[];
  heroEyebrow?: string;
  heroTitle?: string;
  heroDescription?: string;
  showCategoryCards?: boolean;
  showHeroActions?: boolean;
  showSecondaryExplanation?: boolean;
  showMobileAppSection?: boolean;
  categorySectionTitle?: string;
  categorySectionDescription?: string;
};

type MarketplaceDirectoryStateProps = MarketplaceDirectoryProps & {
  initialFilters: ProfessionalDirectoryFilters;
  pathname: string;
  onSearchUrlChange: (url: string) => void;
};

const RESULTS_SECTION_ID = "professionals-results";
const INITIAL_VISIBLE_PROFILE_COUNT = 6;
const PROFILE_BATCH_SIZE = 6;

function buildInitialFilters(
  searchParams: URLSearchParams,
  fixedCategorySlug?: string,
): ProfessionalDirectoryFilters {
  return {
    category: fixedCategorySlug ?? searchParams.get("category") ?? "all",
    location: searchParams.get("location") ?? "all",
    serviceMode: searchParams.get("serviceMode") ?? "all",
    specialty: searchParams.get("specialty") ?? "all",
    query: searchParams.get("q") ?? "",
  };
}

function buildSearchUrl(
  pathname: string,
  filters: ProfessionalDirectoryFilters,
  fixedCategorySlug?: string,
) {
  const params = new URLSearchParams();

  if (!fixedCategorySlug && filters.category !== "all") {
    params.set("category", filters.category);
  }

  if (filters.location !== "all") {
    params.set("location", filters.location);
  }

  if (filters.serviceMode !== "all") {
    params.set("serviceMode", filters.serviceMode);
  }

  if (filters.specialty !== "all") {
    params.set("specialty", filters.specialty);
  }

  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function buildResultsSeed(filters: ProfessionalDirectoryFilters, currentCategorySlug: string | null) {
  return [
    currentCategorySlug ?? filters.category,
    filters.location,
    filters.serviceMode,
    filters.specialty,
    normalizeMarketplaceText(filters.query)?.toLowerCase() ?? "",
  ].join("::");
}

function scrollToResults() {
  window.setTimeout(() => {
    document.getElementById(RESULTS_SECTION_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 60);
}

export function MarketplaceDirectory(props: MarketplaceDirectoryProps) {
  const pathname = usePathname();
  const [searchParamsKey, setSearchParamsKey] = useState("");
  const initialFilters = useMemo(
    () => buildInitialFilters(new URLSearchParams(searchParamsKey), props.fixedCategorySlug),
    [props.fixedCategorySlug, searchParamsKey],
  );
  const hasTrackedView = useRef(false);

  useEffect(() => {
    const syncSearchParams = () => setSearchParamsKey(window.location.search.slice(1));
    const frame = window.requestAnimationFrame(syncSearchParams);

    window.addEventListener("popstate", syncSearchParams);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("popstate", syncSearchParams);
    };
  }, []);

  useEffect(() => {
    if (hasTrackedView.current) {
      return;
    }

    trackEvent("professional_directory_viewed", {
      source_page: props.sourcePage,
      fixed_category: props.fixedCategorySlug ?? "all",
      professional_count: props.professionals.length,
    });
    hasTrackedView.current = true;
  }, [props.fixedCategorySlug, props.professionals.length, props.sourcePage]);

  useEffect(() => {
    const attributeName = "data-marketplace-filter-robots";
    const existingMeta = document.head.querySelector<HTMLMetaElement>(`meta[${attributeName}]`);

    if (!isMarketplaceFilteredSearch(searchParamsKey)) {
      existingMeta?.remove();
      return;
    }

    const robotsMeta = existingMeta ?? document.createElement("meta");
    robotsMeta.name = "robots";
    robotsMeta.content = "noindex, follow";
    robotsMeta.setAttribute(attributeName, "true");

    if (!existingMeta) {
      document.head.appendChild(robotsMeta);
    }

    return () => {
      robotsMeta.remove();
    };
  }, [searchParamsKey]);

  function handleSearchUrlChange(url: string) {
    setSearchParamsKey(new URL(url, window.location.origin).search.slice(1));
  }

  return (
    <MarketplaceDirectoryState
      key={`${pathname}:${props.fixedCategorySlug ?? "all"}:${searchParamsKey}`}
      {...props}
      initialFilters={initialFilters}
      pathname={pathname}
      onSearchUrlChange={handleSearchUrlChange}
    />
  );
}

function MarketplaceDirectoryState({
  categories,
  professionals,
  sourcePage,
  fixedCategorySlug,
  topCategories,
  heroEyebrow = "Elevare marketplace",
  heroTitle = "Find the right support for your goals.",
  heroDescription =
    "Discover trainers, coaches, nutrition professionals, and wellness specialists based on your goals, location, and preferences.",
  showCategoryCards = true,
  showHeroActions = true,
  showSecondaryExplanation = true,
  showMobileAppSection = false,
  categorySectionTitle = "Start with the kind of support you want.",
  categorySectionDescription = "Browse by category first, then narrow by location, service mode, or specialty if you need to.",
  initialFilters,
  pathname,
  onSearchUrlChange,
}: MarketplaceDirectoryStateProps) {
  const router = useRouter();
  const locale = localeFromPathname(pathname);
  const t = (value: string) => marketplaceText(locale, value);
  const [draftFilters, setDraftFilters] = useState<ProfessionalDirectoryFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<ProfessionalDirectoryFilters>(initialFilters);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    initialFilters.serviceMode !== "all" || initialFilters.specialty !== "all",
  );
  const [rotatedCategoryCards, setRotatedCategoryCards] = useState<ProfessionalCategoryRecord[] | null>(null);
  const [visibleProfileCount, setVisibleProfileCount] = useState(INITIAL_VISIBLE_PROFILE_COUNT);
  const [hasStartedSearch, setHasStartedSearch] = useState(
    Boolean(fixedCategorySlug) || hasMeaningfulMarketplaceSearch(initialFilters, fixedCategorySlug),
  );

  const defaultCategoryCards = useMemo(
    () => (topCategories && topCategories.length > 0 ? topCategories : categories.slice(0, 8)),
    [categories, topCategories],
  );
  const shouldRotateCategoryCards = showCategoryCards && !fixedCategorySlug && defaultCategoryCards.length >= 8;

  useEffect(() => {
    if (!shouldRotateCategoryCards) {
      return;
    }

    let isCancelled = false;
    const frame = window.requestAnimationFrame(() => {
      if (isCancelled) {
        return;
      }

      setRotatedCategoryCards(selectMarketplaceCategoryCards(categories, professionals, defaultCategoryCards.length, 2));
    });

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [categories, defaultCategoryCards.length, professionals, shouldRotateCategoryCards]);
  const categoryCards = useMemo(() => {
    if (!showCategoryCards) {
      return [];
    }

    if (shouldRotateCategoryCards) {
      return rotatedCategoryCards ?? defaultCategoryCards;
    }

    return defaultCategoryCards;
  }, [defaultCategoryCards, rotatedCategoryCards, shouldRotateCategoryCards, showCategoryCards]);

  const currentCategorySlug = fixedCategorySlug ?? (appliedFilters.category !== "all" ? appliedFilters.category : null);
  const currentCategory = useMemo(
    () => (currentCategorySlug ? getCategoryBySlug(categories, currentCategorySlug) : null),
    [categories, currentCategorySlug],
  );
  const localizedCurrentCategory = currentCategory ? localizeMarketplaceCategory(currentCategory, locale) : null;
  const exactResults = useMemo(
    () =>
      sortProfessionalsWithRandomizedTies(
        filterProfessionals(professionals, appliedFilters),
        {
          preferredCategorySlug: currentCategorySlug,
          preferredLocation: appliedFilters.location !== "all" ? appliedFilters.location : null,
          preferredServiceMode: appliedFilters.serviceMode !== "all" ? appliedFilters.serviceMode : null,
          referenceSearchText:
            normalizeMarketplaceText(appliedFilters.query)?.toLowerCase()
            ?? normalizeMarketplaceText(appliedFilters.specialty)?.toLowerCase()
            ?? null,
        },
        buildResultsSeed(appliedFilters, currentCategorySlug),
      ),
    [appliedFilters, currentCategorySlug, professionals],
  );
  const hasMeaningfulSearch = hasMeaningfulMarketplaceSearch(appliedFilters, fixedCategorySlug);
  const shouldShowResults = Boolean(fixedCategorySlug) || hasMeaningfulSearch || hasStartedSearch;
  const fallbackGroups = useMemo(
    () =>
      exactResults.length === 0 && hasMeaningfulSearch
        ? buildProfessionalFallbackGroups({
            professionals,
            filters: appliedFilters,
            exactResults,
          })
        : [],
    [appliedFilters, exactResults, hasMeaningfulSearch, professionals],
  );
  const fallbackResultCount = fallbackGroups.reduce((total, group) => total + group.professionals.length, 0);
  const hasInventory = professionals.length > 0;
  const locations = useMemo(() => getUniqueLocations(professionals), [professionals]);
  const specialtyCategorySlug = fixedCategorySlug ?? (draftFilters.category !== "all" ? draftFilters.category : null);
  const specialties = useMemo(() => {
    if (specialtyCategorySlug) {
      return getMarketplaceTaxonomyCategoryByPublicSlug(specialtyCategorySlug)?.specialties ?? [];
    }

    return [...new Set(MARKETPLACE_TAXONOMY_CATEGORIES.flatMap((category) => category.specialties))]
      .sort((left, right) => left.localeCompare(right));
  }, [specialtyCategorySlug]);
  const visibleExactResults = useMemo(
    () => exactResults.slice(0, visibleProfileCount),
    [exactResults, visibleProfileCount],
  );
  const remainingExactResults = Math.max(0, exactResults.length - visibleExactResults.length);
  const advancedFiltersActive = draftFilters.serviceMode !== "all" || draftFilters.specialty !== "all";
  const resultsHeading = !shouldShowResults
    ? t("Find the right support")
    : hasMeaningfulSearch
      ? exactResults.length > 0
        ? t("Results")
        : t("No exact matches yet")
      : localizedCurrentCategory?.label ?? t("Explore Elevare");
  const resultsDescription = !shouldShowResults
    ? t("Use the filters above to browse published professional profiles by category, location, specialty, service mode, or keyword.")
    : hasMeaningfulSearch
      ? exactResults.length > 0
        ? t("These published profiles match your current search filters.")
        : t("We couldn't find someone matching every filter, so here are some other options.")
      : currentCategory
        ? t("Published profiles in this category appear here by default so you can start comparing fit right away.")
        : t("Search the marketplace to view professional profiles.");

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextFilters: ProfessionalDirectoryFilters = {
      category: fixedCategorySlug ?? draftFilters.category,
      location: draftFilters.location,
      serviceMode: draftFilters.serviceMode,
      specialty: draftFilters.specialty,
      query: draftFilters.query.trim(),
    };
    const nextCategorySlug = fixedCategorySlug ?? (nextFilters.category !== "all" ? nextFilters.category : null);
    const nextExactResults = sortProfessionals(filterProfessionals(professionals, nextFilters), {
      preferredCategorySlug: nextCategorySlug,
      preferredLocation: nextFilters.location !== "all" ? nextFilters.location : null,
      preferredServiceMode: nextFilters.serviceMode !== "all" ? nextFilters.serviceMode : null,
      referenceSearchText:
        normalizeMarketplaceText(nextFilters.query)?.toLowerCase()
        ?? normalizeMarketplaceText(nextFilters.specialty)?.toLowerCase()
        ?? null,
    });
    const nextFallbackGroups =
      nextExactResults.length === 0 && hasMeaningfulMarketplaceSearch(nextFilters, fixedCategorySlug)
        ? buildProfessionalFallbackGroups({
            professionals,
            filters: nextFilters,
            exactResults: nextExactResults,
          })
        : [];
    const nextFallbackCount = nextFallbackGroups.reduce((total, group) => total + group.professionals.length, 0);

    trackEvent("professional_search_performed", {
      source_page: sourcePage,
      category: nextCategorySlug ?? "all",
      has_location: Boolean(nextFilters.location.trim()),
      service_mode: nextFilters.serviceMode,
      specialty: nextFilters.specialty,
      query_length: nextFilters.query.length,
      exact_result_count: nextExactResults.length,
    });

    if (nextExactResults.length === 0) {
      trackEvent("professional_search_zero_results", {
        source_page: sourcePage,
        category: nextCategorySlug ?? "all",
        has_location: Boolean(nextFilters.location.trim()),
        service_mode: nextFilters.serviceMode,
        specialty: nextFilters.specialty,
        fallback_result_count: nextFallbackCount,
      });
    }

    if (nextFallbackCount > 0) {
      trackEvent("fallback_results_shown", {
        source_page: sourcePage,
        nearby_count: nextFallbackGroups.find((group) => group.key === "nearby")?.professionals.length ?? 0,
        online_count: nextFallbackGroups.find((group) => group.key === "online")?.professionals.length ?? 0,
        similar_count: nextFallbackGroups.find((group) => group.key === "similar")?.professionals.length ?? 0,
      });
    }

    setHasStartedSearch(true);
    setVisibleProfileCount(INITIAL_VISIBLE_PROFILE_COUNT);
    setAppliedFilters(nextFilters);
    const nextUrl = buildSearchUrl(pathname, nextFilters, fixedCategorySlug);
    router.replace(nextUrl, { scroll: false });
    onSearchUrlChange(nextUrl);
    scrollToResults();
  }

  function handleViewMoreProfiles() {
    const nextVisibleCount = Math.min(visibleProfileCount + PROFILE_BATCH_SIZE, exactResults.length);

    setVisibleProfileCount(nextVisibleCount);
    trackEvent("professional_results_expanded", {
      source_page: sourcePage,
      category: currentCategorySlug ?? "all",
      total_results: exactResults.length,
      visible_results: nextVisibleCount,
    });
  }

  function handleResetFilters() {
    const nextFilters = buildInitialFilters(new URLSearchParams(), fixedCategorySlug);
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setHasStartedSearch(Boolean(fixedCategorySlug));
    setVisibleProfileCount(INITIAL_VISIBLE_PROFILE_COUNT);
    setShowAdvancedFilters(false);
    const nextUrl = buildSearchUrl(pathname, nextFilters, fixedCategorySlug);
    router.replace(nextUrl, { scroll: false });
    onSearchUrlChange(nextUrl);
  }

  return (
    <>
      <section className="hero marketplace-discovery-hero">
        <div className="eyebrow">{t(heroEyebrow)}</div>
        <h1>{t(heroTitle)}</h1>
        <p>{t(heroDescription)}</p>

        {currentCategory ? (
          <div className="marketplace-status-row">
            <span className="meta-pill">{localizedCurrentCategory?.label}</span>
          </div>
        ) : null}

        <article className="panel training-directory-card marketplace-search-panel">
          <form className="marketplace-search-stack" onSubmit={handleSearchSubmit} role="search">
            <div className="marketplace-primary-search">
              <label className="field field-full">
                <span className="field-label">{t("What are you looking for?")}</span>
                <input
                  type="search"
                  value={draftFilters.query}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      query: event.target.value,
                    }))}
                  placeholder={t("Search by service, specialty, or name")}
                />
              </label>

              <label className="field">
                <span className="field-label">{t("Location")}</span>
                <select
                  value={draftFilters.location}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      location: event.target.value,
                    }))}
                >
                  <option value="all">{t("Any location")}</option>
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>

              {!fixedCategorySlug ? (
                <label className="field">
                  <span className="field-label">{t("Category")}</span>
                  <select
                    value={draftFilters.category}
                    onChange={(event) => {
                      const nextCategory = event.target.value;
                      const nextSpecialties = nextCategory === "all"
                        ? MARKETPLACE_TAXONOMY_CATEGORIES.flatMap((category) => category.specialties)
                        : getMarketplaceTaxonomyCategoryByPublicSlug(nextCategory)?.specialties ?? [];

                      setDraftFilters((current) => ({
                        ...current,
                        category: nextCategory,
                        specialty:
                          current.specialty === "all" || nextSpecialties.includes(current.specialty)
                            ? current.specialty
                            : "all",
                      }));
                    }}
                  >
                    <option value="all">{t("All categories")}</option>
                    {categories.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {localizeMarketplaceCategory(category, locale).label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="marketplace-search-submit">
                <button type="submit" className="button button-primary">
                  {t("Search")}
                </button>
              </div>
            </div>

            <details
              className="marketplace-advanced-filters"
              open={showAdvancedFilters}
              onToggle={(event) => setShowAdvancedFilters(event.currentTarget.open)}
            >
              <summary>{t(advancedFiltersActive ? "More filters applied" : "More filters")}</summary>
              <div className="tool-form-grid marketplace-filter-grid">
                <label className="field">
                  <span className="field-label">{t("Service mode")}</span>
                  <select
                    value={draftFilters.serviceMode}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        serviceMode: event.target.value,
                      }))}
                  >
                    <option value="all">{t("All service modes")}</option>
                    <option value="in_person">{t("In person")}</option>
                    <option value="online">{t("Online")}</option>
                    <option value="hybrid">{t("Hybrid")}</option>
                  </select>
                </label>

                <label className="field">
                  <span className="field-label">{t("Specialty")}</span>
                  <select
                    value={draftFilters.specialty}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        specialty: event.target.value,
                      }))}
                  >
                    <option value="all">{t("All specialties")}</option>
                    {specialties.map((specialty) => (
                      <option key={specialty} value={specialty}>
                        {localizeMarketplaceSpecialty(specialty, locale)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </details>

            <div className="marketplace-trust-line">
              <strong>{t("Profiles are reviewed for marketplace eligibility before publication.")}</strong>
              <span>
                {t("Professionals are independent providers, not employees or agents of Elevare Fit LLC. Review is not an endorsement or verification of every claim; credentials are verified only when specifically marked.")}
              </span>
            </div>

            <div className="marketplace-search-footer">
              <button type="button" className="button button-secondary" onClick={handleResetFilters}>
                {t("Clear filters")}
              </button>

              {showHeroActions ? (
                <div className="hero-actions marketplace-hero-actions">
                  <TrackedLink
                    className="button button-secondary"
                    href={localizeProfessionalPath("/account/professional-profile/", locale)}
                    eventName="cta_click"
                    eventParams={{
                      cta_name: "Join as a Pro",
                      cta_context: sourcePage,
                    }}
                  >
                    {t("Join as a Pro")}
                  </TrackedLink>
                  <TrackedLink
                    className="hero-text-link"
                    href="/sign-in/"
                    eventName="cta_click"
                    eventParams={{
                      cta_name: "Sign In",
                      cta_context: sourcePage,
                    }}
                  >
                    {t("Sign In")}
                  </TrackedLink>
                </div>
              ) : null}
            </div>
          </form>
        </article>
      </section>

      {showCategoryCards && categoryCards.length > 0 ? (
        <section className="section section-compact">
          <div className="section-head section-head-compact">
            <div className="eyebrow">{t("Browse by category")}</div>
            <h2 className="section-title section-title-compact">{t(categorySectionTitle)}</h2>
            <p className="section-copy">{t(categorySectionDescription)}</p>
          </div>

          <div className="professional-category-grid">
            {categoryCards.map((category) => {
              const localizedCategory = localizeMarketplaceCategory(category, locale);
              return (
              <TrackedLink
                key={category.slug}
                className="proof-card proof-card-link"
                href={localizeProfessionalPath(`/professionals/${category.slug}`, locale)}
                eventName="category_card_clicked"
                eventParams={{
                  source_page: sourcePage,
                  category: category.slug,
                }}
              >
                <span className="proof-label">{localizedCategory.label}</span>
                <div className="proof-value">{localizedCategory.headline}</div>
                <p className="proof-copy">{localizedCategory.shortDescription ?? t("Browse profiles in this category.")}</p>
                <span className="proof-action">{t("Browse category")}</span>
              </TrackedLink>
              );
            })}
          </div>
        </section>
      ) : null}

      <section id={RESULTS_SECTION_ID} className="section section-compact">
        <div className="section-head section-head-compact">
          <div className="eyebrow">{t(hasMeaningfulSearch ? "Search results" : "Explore")}</div>
          <h2 className="section-title section-title-compact">{resultsHeading}</h2>
          <p className="section-copy">{resultsDescription}</p>
        </div>

        {!shouldShowResults ? (
          <article className="callout marketplace-empty-callout">
            <span className="meta-pill">{t("Browse professional profiles")}</span>
            <h2>{t("Start by refining your search.")}</h2>
            <p>
              {t("Matching profiles will appear here once you choose a category, location, specialty, service mode, or keyword.")}
            </p>
          </article>
        ) : exactResults.length > 0 ? (
          <>
            <div className="training-results-head marketplace-results-head">
              <strong>
                {remainingExactResults > 0
                  ? `${t("Showing")} ${visibleExactResults.length.toLocaleString(locale)} ${t("of")} ${exactResults.length.toLocaleString(locale)} ${t("profiles")}`
                  : `${exactResults.length.toLocaleString(locale)} ${t("profiles")}`}
              </strong>
              <span>
                {remainingExactResults > 0
                  ? t("These are the first profiles from your current search. View more to see the rest.")
                  : t("Only marketplace-eligible, active, public profiles appear in marketplace search.")}
              </span>
            </div>

            <div className="professional-grid">
              {visibleExactResults.map((professional) => (
                <ProfessionalCard
                  key={professional.id}
                  professional={professional}
                  sourcePage={sourcePage}
                  locale={locale}
                />
              ))}
            </div>

            {remainingExactResults > 0 ? (
              <div className="marketplace-results-actions">
                <button type="button" className="button button-secondary" onClick={handleViewMoreProfiles}>
                  {t("View more")} ({Math.min(PROFILE_BATCH_SIZE, remainingExactResults).toLocaleString(locale)})
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <article className="callout marketplace-empty-callout">
              <span className="meta-pill">
                {hasMeaningfulSearch
                  ? t("No exact matches yet")
                  : hasInventory
                    ? t("Nothing live in this view yet")
                    : t("Marketplace inventory is growing")}
              </span>
              <h2>{t(hasMeaningfulSearch ? "No exact matches yet" : "Nothing live in this view yet.")}</h2>
              <p>
                {hasMeaningfulSearch
                  ? t("We couldn't find someone matching every filter, so here are some other options.")
                  : t("There are not any published profiles visible in this view yet, so the best next step is to widen the search or tell us what you need.")}
              </p>
            </article>

            {fallbackGroups.length > 0 ? (
              <div className="marketplace-fallback-stack">
                {fallbackGroups.map((group) => (
                  <section key={group.key} className="marketplace-fallback-group">
                    <div className="section-head section-head-compact">
                      <div className="eyebrow">{t("Fallback results")}</div>
                      <h3>{t(group.title)}</h3>
                      <p>{t(group.description)}</p>
                    </div>

                    <div className="professional-grid">
                      {group.professionals.map((professional) => (
                        <ProfessionalCard
                          key={professional.id}
                          professional={professional}
                          sourcePage={`${sourcePage}_${group.key}`}
                          actionLabel={t("View profile")}
                          locale={locale}
                          eventName="fallback_professional_clicked"
                          eventParams={{
                            fallback_group: group.key,
                            original_category: currentCategorySlug ?? "all",
                          }}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <article className="callout marketplace-demand-callout">
                <span className="meta-pill">{t("Can't find what you're looking for?")}</span>
                <h2>{t("Tell us what you need.")}</h2>
                <p>
                  {t("We'll save this search demand so we know where the marketplace needs better coverage.")}
                </p>
                <MarketplaceDemandForm
                  key={`${sourcePage}:${fixedCategorySlug ?? "all"}:${appliedFilters.category}:${appliedFilters.location}:${appliedFilters.serviceMode}:${appliedFilters.specialty}:${appliedFilters.query}`}
                  categories={categories}
                  filters={appliedFilters}
                  fixedCategorySlug={fixedCategorySlug}
                  sourcePage={sourcePage}
                  exactResultCount={exactResults.length}
                  fallbackResultCount={fallbackResultCount}
                />
              </article>
            )}
          </>
        )}
      </section>

      {showSecondaryExplanation ? (
        <section className="section">
          <div className="grid-3">
            <article className="panel">
              <span className="stat-label">{t("How Elevare works")}</span>
              <h3>{t("Compare fit before you reach out.")}</h3>
              <p>
                {t("Public profiles focus on category fit, service mode, specialties, and pricing context so the shortlist feels clearer before you contact anyone.")}
              </p>
            </article>
            <article className="panel">
              <span className="stat-label">{t("Related tools")}</span>
              <h3>{t("Use calculators and workouts when it helps.")}</h3>
              <p>
                {t("Explore free tools, workouts, and tracking resources if you want more context before choosing support.")}
              </p>
              <div className="button-row">
                <TrackedLink
                  className="button button-secondary"
                  href={localizePathname("/calculators/", locale)}
                  eventName="cta_click"
                  eventParams={{ cta_name: "Browse calculators", cta_context: `${sourcePage}_related` }}
                >
                  {t("Browse calculators")}
                </TrackedLink>
                <TrackedLink
                  className="button button-secondary"
                  href={localizePathname("/workouts/", locale)}
                  eventName="cta_click"
                  eventParams={{ cta_name: "Browse workouts", cta_context: `${sourcePage}_related` }}
                >
                  {t("Browse workouts")}
                </TrackedLink>
              </div>
            </article>
            <article className="panel">
              <span className="stat-label">{t("For pros")}</span>
              <h3>{t("Join when you want to be discoverable.")}</h3>
              <p>
                {t("Build your profile, add public-safe credential details, and submit it for review before it appears in the marketplace.")}
              </p>
              <div className="button-row">
                <TrackedLink
                  className="button button-secondary"
                  href={localizeProfessionalPath("/account/professional-profile/", locale)}
                  eventName="cta_click"
                  eventParams={{ cta_name: "Join as a Pro", cta_context: `${sourcePage}_secondary` }}
                >
                  {t("Join as a Pro")}
                </TrackedLink>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {showMobileAppSection ? <ElevareMobileAppSection sourcePage={sourcePage} /> : null}
    </>
  );
}
