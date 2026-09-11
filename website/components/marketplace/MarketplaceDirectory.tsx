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
  getMarketplaceCategorySupply,
  getMarketplaceResultCountBand,
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
  rotationSeed?: string;
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
    const results = document.getElementById(RESULTS_SECTION_ID);
    results?.focus({ preventScroll: true });
    results?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 60);
}

export function MarketplaceDirectory(props: MarketplaceDirectoryProps) {
  const pathname = usePathname();
  useEffect(() => {
    const reveal = () => {
      if (window.location.hash !== "#guided-matching") return;
      const target = document.getElementById("guided-matching");
      if (target instanceof HTMLDetailsElement) target.open = true;
      target?.scrollIntoView({ block: "start" });
    };
    const frame = requestAnimationFrame(reveal);
    window.addEventListener("hashchange", reveal);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", reveal); };
  }, [pathname]);
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
      result_count_band: getMarketplaceResultCountBand(props.professionals.length),
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
  rotationSeed = "marketplace",
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
  const [visibleProfileCount, setVisibleProfileCount] = useState(INITIAL_VISIBLE_PROFILE_COUNT);
  const hasTrackedInitialResults = useRef(false);

  const categorySupply = useMemo(
    () => getMarketplaceCategorySupply(categories, professionals),
    [categories, professionals],
  );
  const categoryCards = useMemo(() => {
    if (!showCategoryCards) {
      return [];
    }

    const requestedLimit = topCategories?.length || 8;
    return selectMarketplaceCategoryCards(categories, professionals, requestedLimit);
  }, [categories, professionals, showCategoryCards, topCategories?.length]);
  const emptyCategoryCards = useMemo(
    () => categorySupply.filter((entry) => entry.listedCount === 0).map((entry) => entry.category),
    [categorySupply],
  );

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
        `${rotationSeed}:${buildResultsSeed(appliedFilters, currentCategorySlug)}`,
      ),
    [appliedFilters, currentCategorySlug, professionals, rotationSeed],
  );
  const hasMeaningfulSearch = hasMeaningfulMarketplaceSearch(appliedFilters, fixedCategorySlug);
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
  const acceptingResultCount = exactResults.filter((professional) => professional.clientAcceptanceStatus === "accepting").length;
  const allExactResultsAccepting = exactResults.length > 0 && acceptingResultCount === exactResults.length;
  const resultsHeading = hasMeaningfulSearch
    ? exactResults.length > 0
      ? t("Results")
      : t("No exact matches yet")
    : localizedCurrentCategory?.label
      ?? t(allExactResultsAccepting ? "Professionals accepting clients" : "Explore professionals");
  const resultsDescription = hasMeaningfulSearch
    ? exactResults.length > 0
      ? t("These published profiles match your current search filters.")
      : t("No available professionals currently match all selected preferences. Adjust a filter or ask Elevare to help look for the right fit.")
    : currentCategory
      ? t("Published profiles in this category appear here by default so you can start comparing fit right away.")
      : allExactResultsAccepting
        ? t("Start with professionals who are currently accepting clients, then refine by category, location, service mode, or specialty.")
        : t("Browse published professional profiles, then refine the list when you know what support you want.");

  useEffect(() => {
    if (hasTrackedInitialResults.current) return;
    trackEvent("professional_initial_results_displayed", {
      source_page: sourcePage,
      result_count_band: getMarketplaceResultCountBand(exactResults.length),
      accepting_result_count_band: getMarketplaceResultCountBand(acceptingResultCount),
    });
    hasTrackedInitialResults.current = true;
  }, [acceptingResultCount, exactResults.length, sourcePage]);

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
      has_location: Boolean(nextFilters.location.trim()) && nextFilters.location !== "all",
      service_mode: nextFilters.serviceMode,
      has_specialty: nextFilters.specialty !== "all",
      query_length: nextFilters.query.length,
      result_count_band: getMarketplaceResultCountBand(nextExactResults.length),
    });

    if (nextExactResults.length === 0) {
      trackEvent("professional_search_zero_results", {
        source_page: sourcePage,
        category: nextCategorySlug ?? "all",
        has_location: Boolean(nextFilters.location.trim()) && nextFilters.location !== "all",
        service_mode: nextFilters.serviceMode,
        has_specialty: nextFilters.specialty !== "all",
        fallback_result_count_band: getMarketplaceResultCountBand(nextFallbackCount),
      });
    }

    if (nextFallbackCount > 0) {
      trackEvent("fallback_results_shown", {
        source_page: sourcePage,
        nearby_result_count_band: getMarketplaceResultCountBand(nextFallbackGroups.find((group) => group.key === "nearby")?.professionals.length ?? 0),
        online_result_count_band: getMarketplaceResultCountBand(nextFallbackGroups.find((group) => group.key === "online")?.professionals.length ?? 0),
        similar_result_count_band: getMarketplaceResultCountBand(nextFallbackGroups.find((group) => group.key === "similar")?.professionals.length ?? 0),
      });
    }

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
      result_count_band: getMarketplaceResultCountBand(exactResults.length),
      visible_result_count_band: getMarketplaceResultCountBand(nextVisibleCount),
    });
  }

  function handleResetFilters() {
    const nextFilters = buildInitialFilters(new URLSearchParams(), fixedCategorySlug);
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setVisibleProfileCount(INITIAL_VISIBLE_PROFILE_COUNT);
    setShowAdvancedFilters(false);
    const nextUrl = buildSearchUrl(pathname, nextFilters, fixedCategorySlug);
    router.replace(nextUrl, { scroll: false });
    onSearchUrlChange(nextUrl);
    trackEvent("marketplace_filters_reset", {
      source_page: sourcePage,
      fixed_category: fixedCategorySlug ?? "all",
    });
    scrollToResults();
  }

  function applyFilterRelaxation(nextFilters: ProfessionalDirectoryFilters, relaxation: string) {
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setVisibleProfileCount(INITIAL_VISIBLE_PROFILE_COUNT);
    const nextUrl = buildSearchUrl(pathname, nextFilters, fixedCategorySlug);
    router.replace(nextUrl, { scroll: false });
    onSearchUrlChange(nextUrl);
    trackEvent("marketplace_filter_relaxed", {
      source_page: sourcePage,
      relaxation,
    });
    scrollToResults();
  }

  function handleRemoveFilter(filter: keyof ProfessionalDirectoryFilters) {
    const nextFilters: ProfessionalDirectoryFilters = {
      ...appliedFilters,
      [filter]: filter === "query" ? "" : "all",
    };
    applyFilterRelaxation(nextFilters, `remove_${filter}`);
  }

  function handleIncludeOnline() {
    const nextFilters: ProfessionalDirectoryFilters = {
      ...appliedFilters,
      location: "all",
      serviceMode: "online",
    };
    applyFilterRelaxation(nextFilters, "include_online");
    trackEvent("marketplace_online_option_selected", { source_page: sourcePage });
  }

  const selectedCategory = appliedFilters.category !== "all"
    ? getCategoryBySlug(categories, appliedFilters.category)
    : null;
  const activeFilterChips = [
    appliedFilters.category !== "all" && !fixedCategorySlug
      ? { key: "category" as const, label: selectedCategory ? localizeMarketplaceCategory(selectedCategory, locale).label : appliedFilters.category }
      : null,
    appliedFilters.location !== "all" ? { key: "location" as const, label: appliedFilters.location } : null,
    appliedFilters.serviceMode !== "all" ? { key: "serviceMode" as const, label: t(appliedFilters.serviceMode === "in_person" ? "In person" : appliedFilters.serviceMode === "online" ? "Online" : "Hybrid") } : null,
    appliedFilters.specialty !== "all" ? { key: "specialty" as const, label: localizeMarketplaceSpecialty(appliedFilters.specialty, locale) } : null,
    appliedFilters.query ? { key: "query" as const, label: t("Keyword search") } : null,
  ].filter((chip): chip is { key: keyof ProfessionalDirectoryFilters; label: string } => Boolean(chip));

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
              <TrackedLink
                className="marketplace-trust-link"
                href={localizePathname("/trust-safety/", locale)}
                eventName="trust_explanation_opened"
                eventParams={{ source_page: sourcePage }}
              >
                {t("Learn how Elevare trust checks work")}
              </TrackedLink>
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

      {activeFilterChips.length > 0 ? (
        <section className="section section-compact marketplace-active-filters" aria-label={t("Active filters")}>
          <span className="stat-label">{t("Active filters")}</span>
          <div className="marketplace-filter-chips">
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="marketplace-filter-chip"
                onClick={() => handleRemoveFilter(chip.key)}
                aria-label={`${t("Remove filter")}: ${chip.label}`}
              >
                <span>{chip.label}</span>
                <span aria-hidden="true">×</span>
              </button>
            ))}
            <button type="button" className="marketplace-filter-clear" onClick={handleResetFilters}>
              {t("Clear all")}
            </button>
          </div>
        </section>
      ) : null}

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
              const supply = categorySupply.find((entry) => entry.category.slug === category.slug);
              const supplyLabel = supply && supply.acceptingCount > 0
                ? t("Accepting clients")
                : t("Profiles available to browse");
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
                <span className="marketplace-category-availability">{supplyLabel}</span>
                <span className="proof-action">{t("Browse category")}</span>
              </TrackedLink>
              );
            })}
          </div>

          {emptyCategoryCards.length > 0 ? (
            <details className="marketplace-more-categories">
              <summary>{t("More types of support")}</summary>
              <p>{t("These categories do not have a published profile yet. You can still tell Elevare what support you need.")}</p>
              <div className="marketplace-more-category-links">
                {emptyCategoryCards.map((category) => (
                  <TrackedLink
                    key={category.slug}
                    href={localizeProfessionalPath(`/professionals/${category.slug}`, locale)}
                    eventName="category_card_clicked"
                    eventParams={{ source_page: `${sourcePage}_more_support`, category: category.slug }}
                  >
                    {localizeMarketplaceCategory(category, locale).label}
                  </TrackedLink>
                ))}
              </div>
            </details>
          ) : null}
        </section>
      ) : null}

      <section id={RESULTS_SECTION_ID} className="section section-compact marketplace-results-section" aria-live="polite" aria-busy="false" tabIndex={-1}>
        <div className="section-head section-head-compact">
          <div className="eyebrow">{t(hasMeaningfulSearch ? "Search results" : "Explore")}</div>
          <h2 className="section-title section-title-compact">{resultsHeading}</h2>
          <p className="section-copy">{resultsDescription}</p>
        </div>

        {exactResults.length > 0 ? (
          <>
            <div className="training-results-head marketplace-results-head">
              <strong>
                {!hasMeaningfulSearch
                  ? t(allExactResultsAccepting ? "Available professionals" : "Published professionals")
                  : remainingExactResults > 0
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

            {(
              <details id="guided-matching" className="marketplace-guided-help">
                <summary>{t("Want help finding the right professional?")}</summary>
                <p>{t("Tell Elevare what support you want. We will review the request, but a suitable match is not guaranteed.")}</p>
                <MarketplaceDemandForm
                  categories={categories}
                  filters={appliedFilters}
                  fixedCategorySlug={fixedCategorySlug}
                  sourcePage={`${sourcePage}_guided`}
                  exactResultCount={exactResults.length}
                  fallbackResultCount={fallbackResultCount}
                />
              </details>
            )}
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
               <h2>{t(hasMeaningfulSearch ? "No exact matches yet" : hasInventory ? "Nothing live in this view yet." : "Elevare is building its professional network")}</h2>
               <p>
                {hasMeaningfulSearch
                  ? t("We couldn't find someone matching every filter, so here are some other options.")
                  : t("There are not any published profiles visible in this view yet, so the best next step is to widen the search or tell us what you need.")}
               </p>
               <div className="button-row marketplace-empty-actions">
                 {hasMeaningfulSearch ? (
                   <button type="button" className="button button-secondary" onClick={handleResetFilters}>
                     {t("Browse all available professionals")}
                   </button>
                 ) : null}
                 {(appliedFilters.location !== "all" || appliedFilters.serviceMode === "in_person") ? (
                   <button type="button" className="button button-secondary" onClick={handleIncludeOnline}>
                     {t("Include online professionals")}
                   </button>
                 ) : null}
               </div>
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
            ) : null}

             <article id="guided-matching" className="callout marketplace-demand-callout">
              <span className="meta-pill">{t(hasInventory ? "Help me find the right professional" : "Elevare is building its professional network")}</span>
              <h2>{t("Tell us what you need.")}</h2>
              <p>
                {t(hasInventory
                  ? "Elevare will review your preferences and let you know whether we can identify a suitable professional. A match is not guaranteed."
                  : "Tell us what support you are looking for, and we will let you know whether we can identify a suitable professional. A match is not guaranteed.")}
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
              {!hasInventory ? (
                <div className="button-row marketplace-empty-network-actions">
                  <TrackedLink className="button button-secondary" href={localizePathname("/calculators/", locale)} eventName="cta_click" eventParams={{ cta_name: "Browse calculators", cta_context: `${sourcePage}_empty` }}>
                    {t("Browse free tools")}
                  </TrackedLink>
                  <TrackedLink className="button button-secondary" href={localizeProfessionalPath("/account/professional-profile/", locale)} eventName="cta_click" eventParams={{ cta_name: "Join as a Pro", cta_context: `${sourcePage}_empty` }}>
                    {t("Join as a Pro")}
                  </TrackedLink>
                </div>
              ) : null}
            </article>
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
