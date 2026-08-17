"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ElevareMobileAppSection } from "@/components/marketplace/ElevareMobileAppSection";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MarketplaceDemandForm } from "@/components/marketplace/MarketplaceDemandForm";
import { ProfessionalCard } from "@/components/marketplace/ProfessionalCard";
import { TrackedLink } from "@/components/TrackedLink";
import { trackEvent } from "@/lib/analytics";
import {
  buildProfessionalFallbackGroups,
  filterProfessionals,
  getCategoryBySlug,
  getUniqueLocations,
  getUniqueSpecialties,
  hasMeaningfulMarketplaceSearch,
  normalizeMarketplaceText,
  selectMarketplaceCategoryCards,
  sortProfessionals,
  type ProfessionalDirectoryFilters,
} from "@/lib/marketplace-helpers";
import type { ProfessionalCategoryRecord, ProfessionalProfileRecord } from "@/lib/marketplace-types";

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
};

const RESULTS_SECTION_ID = "professionals-results";

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
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const initialFilters = useMemo(
    () => buildInitialFilters(new URLSearchParams(searchParamsKey), props.fixedCategorySlug),
    [props.fixedCategorySlug, searchParamsKey],
  );
  const hasTrackedView = useRef(false);

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

  return (
    <MarketplaceDirectoryState
      key={`${pathname}:${props.fixedCategorySlug ?? "all"}:${searchParamsKey}`}
      {...props}
      initialFilters={initialFilters}
      pathname={pathname}
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
    "Discover reviewed trainers, coaches, nutrition professionals, and wellness specialists based on your goals, location, and preferences.",
  showCategoryCards = true,
  showHeroActions = true,
  showSecondaryExplanation = true,
  showMobileAppSection = false,
  categorySectionTitle = "Start with the kind of support you want.",
  categorySectionDescription = "Browse by category first, then narrow by location, service mode, or specialty if you need to.",
  initialFilters,
  pathname,
}: MarketplaceDirectoryStateProps) {
  const router = useRouter();
  const [draftFilters, setDraftFilters] = useState<ProfessionalDirectoryFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<ProfessionalDirectoryFilters>(initialFilters);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    initialFilters.serviceMode !== "all" || initialFilters.specialty !== "all",
  );
  const [rotatedCategoryCards, setRotatedCategoryCards] = useState<ProfessionalCategoryRecord[] | null>(null);

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
  const exactResults = useMemo(
    () =>
      sortProfessionals(filterProfessionals(professionals, appliedFilters), {
        preferredCategorySlug: currentCategorySlug,
        preferredLocation: appliedFilters.location !== "all" ? appliedFilters.location : null,
        preferredServiceMode: appliedFilters.serviceMode !== "all" ? appliedFilters.serviceMode : null,
        referenceSearchText:
          normalizeMarketplaceText(appliedFilters.query)?.toLowerCase()
          ?? normalizeMarketplaceText(appliedFilters.specialty)?.toLowerCase()
          ?? null,
      }),
    [appliedFilters, currentCategorySlug, professionals],
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
  const specialties = useMemo(() => getUniqueSpecialties(professionals), [professionals]);
  const advancedFiltersActive = draftFilters.serviceMode !== "all" || draftFilters.specialty !== "all";
  const resultsHeading = hasMeaningfulSearch
    ? exactResults.length > 0
      ? "Results"
      : "No exact matches yet"
    : currentCategory?.label ?? "Explore Elevare";
  const resultsDescription = hasMeaningfulSearch
    ? exactResults.length > 0
      ? "These reviewed profiles match your current search filters."
      : "We couldn't find someone matching every filter, so here are some other options."
    : currentCategory
      ? "Reviewed profiles in this category appear here by default so you can start comparing fit right away."
      : "Reviewed profiles appear here by default so you can start exploring right away.";

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
      location: nextFilters.location,
      service_mode: nextFilters.serviceMode,
      specialty: nextFilters.specialty,
      query_length: nextFilters.query.length,
      exact_result_count: nextExactResults.length,
    });

    if (nextExactResults.length === 0) {
      trackEvent("professional_search_zero_results", {
        source_page: sourcePage,
        category: nextCategorySlug ?? "all",
        location: nextFilters.location,
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

    setAppliedFilters(nextFilters);
    router.replace(buildSearchUrl(pathname, nextFilters, fixedCategorySlug), { scroll: false });
    scrollToResults();
  }

  function handleResetFilters() {
    const nextFilters = buildInitialFilters(new URLSearchParams(), fixedCategorySlug);
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setShowAdvancedFilters(false);
    router.replace(buildSearchUrl(pathname, nextFilters, fixedCategorySlug), { scroll: false });
  }

  return (
    <>
      <section className="hero marketplace-discovery-hero">
        <div className="eyebrow">{heroEyebrow}</div>
        <h1>{heroTitle}</h1>
        <p>{heroDescription}</p>

        {currentCategory ? (
          <div className="marketplace-status-row">
            <span className="meta-pill">{currentCategory.label}</span>
          </div>
        ) : null}

        <article className="panel training-directory-card marketplace-search-panel">
          <form className="marketplace-search-stack" onSubmit={handleSearchSubmit} role="search">
            <div className="marketplace-primary-search">
              <label className="field field-full">
                <span className="field-label">What are you looking for?</span>
                <input
                  type="search"
                  value={draftFilters.query}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      query: event.target.value,
                    }))}
                  placeholder="Search by service, specialty, or name"
                />
              </label>

              <label className="field">
                <span className="field-label">Location</span>
                <select
                  value={draftFilters.location}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      location: event.target.value,
                    }))}
                >
                  <option value="all">Any location</option>
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>

              {!fixedCategorySlug ? (
                <label className="field">
                  <span className="field-label">Category</span>
                  <select
                    value={draftFilters.category}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        category: event.target.value,
                      }))}
                  >
                    <option value="all">All categories</option>
                    {categories.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="marketplace-search-submit">
                <button type="submit" className="button button-primary">
                  Search
                </button>
              </div>
            </div>

            <details
              className="marketplace-advanced-filters"
              open={showAdvancedFilters}
              onToggle={(event) => setShowAdvancedFilters(event.currentTarget.open)}
            >
              <summary>{advancedFiltersActive ? "More filters applied" : "More filters"}</summary>
              <div className="tool-form-grid marketplace-filter-grid">
                <label className="field">
                  <span className="field-label">Service mode</span>
                  <select
                    value={draftFilters.serviceMode}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        serviceMode: event.target.value,
                      }))}
                  >
                    <option value="all">All service modes</option>
                    <option value="in_person">In person</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </label>

                <label className="field">
                  <span className="field-label">Specialty</span>
                  <select
                    value={draftFilters.specialty}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        specialty: event.target.value,
                      }))}
                  >
                    <option value="all">All specialties</option>
                    {specialties.map((specialty) => (
                      <option key={specialty} value={specialty}>
                        {specialty}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </details>

            <div className="marketplace-trust-line">
              <strong>Profiles are reviewed before appearing on Elevare.</strong>
              <span>Browse by category, location, and service mode to narrow the right fit.</span>
            </div>

            <div className="marketplace-search-footer">
              <button type="button" className="button button-secondary" onClick={handleResetFilters}>
                Clear filters
              </button>

              {showHeroActions ? (
                <div className="hero-actions marketplace-hero-actions">
                  <TrackedLink
                    className="button button-secondary"
                    href="/account/professional-profile/"
                    eventName="cta_click"
                    eventParams={{
                      cta_name: "Join as a Pro",
                      cta_context: sourcePage,
                    }}
                  >
                    Join as a Pro
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
                    Sign In
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
            <div className="eyebrow">Browse by category</div>
            <h2 className="section-title section-title-compact">{categorySectionTitle}</h2>
            <p className="section-copy">{categorySectionDescription}</p>
          </div>

          <div className="professional-category-grid">
            {categoryCards.map((category) => (
              <TrackedLink
                key={category.slug}
                className="proof-card proof-card-link"
                href={`/professionals/${category.slug}`}
                eventName="category_card_clicked"
                eventParams={{
                  source_page: sourcePage,
                  category: category.slug,
                }}
              >
                <span className="proof-label">{category.label}</span>
                <div className="proof-value">{category.headline}</div>
                <p className="proof-copy">{category.shortDescription ?? "Browse profiles in this category."}</p>
                <span className="proof-action">Browse category</span>
              </TrackedLink>
            ))}
          </div>
        </section>
      ) : null}

      <section id={RESULTS_SECTION_ID} className="section section-compact">
        <div className="section-head section-head-compact">
          <div className="eyebrow">{hasMeaningfulSearch ? "Search results" : "Explore"}</div>
          <h2 className="section-title section-title-compact">{resultsHeading}</h2>
          <p className="section-copy">{resultsDescription}</p>
        </div>

        {exactResults.length > 0 ? (
          <>
            <div className="training-results-head marketplace-results-head">
              <strong>{exactResults.length.toLocaleString()} profiles</strong>
              <span>Only reviewed, active, public profiles appear in marketplace search.</span>
            </div>

            <div className="professional-grid">
              {exactResults.map((professional) => (
                <ProfessionalCard
                  key={professional.id}
                  professional={professional}
                  sourcePage={sourcePage}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <article className="callout marketplace-empty-callout">
              <span className="meta-pill">
                {hasMeaningfulSearch
                  ? "No exact matches yet"
                  : hasInventory
                    ? "Nothing live in this view yet"
                    : "Marketplace inventory is growing"}
              </span>
              <h2>{hasMeaningfulSearch ? "No exact matches yet" : "Nothing live in this view yet."}</h2>
              <p>
                {hasMeaningfulSearch
                  ? "We couldn't find someone matching every filter, so here are some other options."
                  : "There are not any reviewed profiles visible in this view yet, so the best next step is to widen the search or tell us what you need."}
              </p>
            </article>

            {fallbackGroups.length > 0 ? (
              <div className="marketplace-fallback-stack">
                {fallbackGroups.map((group) => (
                  <section key={group.key} className="marketplace-fallback-group">
                    <div className="section-head section-head-compact">
                      <div className="eyebrow">Fallback results</div>
                      <h3>{group.title}</h3>
                      <p>{group.description}</p>
                    </div>

                    <div className="professional-grid">
                      {group.professionals.map((professional) => (
                        <ProfessionalCard
                          key={professional.id}
                          professional={professional}
                          sourcePage={`${sourcePage}_${group.key}`}
                          actionLabel="View profile"
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
                <span className="meta-pill">Can&apos;t find what you&apos;re looking for?</span>
                <h2>Tell us what you need.</h2>
                <p>
                  We&apos;ll save this search demand so we know where the marketplace needs better coverage.
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
              <span className="stat-label">How Elevare works</span>
              <h3>Compare fit before you reach out.</h3>
              <p>
                Public profiles focus on category fit, service mode, specialties, and pricing context so the shortlist
                feels clearer before you contact anyone.
              </p>
            </article>
            <article className="panel">
              <span className="stat-label">Related tools</span>
              <h3>Use calculators and workouts when it helps.</h3>
              <p>
                Explore free tools, workouts, and tracking resources if you want more context before choosing support.
              </p>
              <div className="button-row">
                <TrackedLink
                  className="button button-secondary"
                  href="/calculators/"
                  eventName="cta_click"
                  eventParams={{ cta_name: "Browse calculators", cta_context: `${sourcePage}_related` }}
                >
                  Browse calculators
                </TrackedLink>
                <TrackedLink
                  className="button button-secondary"
                  href="/workouts/"
                  eventName="cta_click"
                  eventParams={{ cta_name: "Browse workouts", cta_context: `${sourcePage}_related` }}
                >
                  Browse workouts
                </TrackedLink>
              </div>
            </article>
            <article className="panel">
              <span className="stat-label">For pros</span>
              <h3>Join when you want to be discoverable.</h3>
              <p>
                Build your profile, add public-safe credential details, and submit it for review before it appears in
                the marketplace.
              </p>
              <div className="button-row">
                <TrackedLink
                  className="button button-secondary"
                  href="/account/professional-profile/"
                  eventName="cta_click"
                  eventParams={{ cta_name: "Join as a Pro", cta_context: `${sourcePage}_secondary` }}
                >
                  Join as a Pro
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
