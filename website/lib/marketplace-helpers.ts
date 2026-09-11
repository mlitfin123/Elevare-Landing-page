import type {
  MarketplaceSnapshot,
  ProfessionalCategoryRecord,
  ProfessionalCredentialRecord,
  ProfessionalProfileRecord,
  ProfessionalServiceRecord,
} from "./marketplace-types.ts";
import {
  buildMarketplaceCategoryFaqs,
  getMarketplaceTaxonomyCategoryByPublicSlug,
  MARKETPLACE_CATEGORY_RELATED_PUBLIC_SLUGS,
} from "./marketplace-taxonomy.ts";
import {
  getMarketplaceCategoryProfessionalCount,
  isOnlineOnlyMarketplaceProfessional,
  isPublicMarketplaceProfessional,
} from "./marketplace-seo.ts";
import {
  formatMarketplaceLocation,
  formatPublicLocation,
  getCountryDisplayName,
  getRegionDisplayName,
  normalizeCountryCode,
} from "./marketplace-location.ts";

export type ProfessionalDirectoryFilters = {
  category: string;
  location: string;
  serviceMode: string;
  specialty: string;
  query: string;
};

export type ProfessionalSortOptions = {
  preferredCategorySlug?: string | null;
  preferredLocation?: string | null;
  preferredServiceMode?: string | null;
  preferOnline?: boolean;
  referenceSearchText?: string | null;
};

export type ProfessionalFallbackGroupKey = "nearby" | "online" | "similar";

export type ProfessionalFallbackGroup = {
  key: ProfessionalFallbackGroupKey;
  title: string;
  description: string;
  professionals: ProfessionalProfileRecord[];
};

export type MarketplaceResultCountBand =
  | "zero"
  | "one"
  | "two_to_three"
  | "four_to_ten"
  | "more_than_ten";

export type MarketplaceCategorySupply = {
  category: ProfessionalCategoryRecord;
  acceptingCount: number;
  listedCount: number;
};

type BuildProfessionalFallbackGroupsOptions = {
  professionals: ProfessionalProfileRecord[];
  filters: ProfessionalDirectoryFilters;
  exactResults: ProfessionalProfileRecord[];
  limit?: number;
};

export function normalizeMarketplaceText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function parseMarketplaceLocationLabel(value: string | null | undefined) {
  const normalized = normalizeMarketplaceText(value);

  if (!normalized || normalized.toLowerCase() === "all") {
    return null;
  }

  if (normalized.toLowerCase() === "online") {
    return {
      raw: normalized,
      city: null,
      state: null,
      isOnline: true,
    };
  }

  const [cityPart, ...stateParts] = normalized.split(",").map((entry) => entry.trim()).filter(Boolean);
  const city = cityPart ? cityPart.toLowerCase() : null;
  const state = stateParts.length > 0 ? stateParts.join(", ").toLowerCase() : null;

  return {
    raw: normalized,
    city,
    state,
    isOnline: false,
  };
}

export function formatServiceModeLabel(value: string | null | undefined) {
  switch (value) {
    case "in_person":
      return "In person";
    case "online":
      return "Online";
    case "hybrid":
      return "Hybrid";
    default:
      return "Flexible";
  }
}

export function formatApprovalStatusLabel(value: string | null | undefined) {
  switch (value) {
    case "pending_review":
      return "Pending review";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "suspended":
      return "Suspended";
    case "inactive":
      return "Inactive";
    case "draft":
    default:
      return "Draft";
  }
}

export function formatIdentityVerificationLabel(value: string | null | undefined) {
  switch (value) {
    case "verified":
      return "Identity verified";
    case "pending":
      return "Identity review pending";
    case "failed":
      return "Identity verification failed";
    case "unverified":
    default:
      return "Identity not verified";
  }
}

export function getProfessionalStatusMessage(
  approvalStatus: string | null | undefined,
  reviewFeedbackPublic?: string | null,
) {
  const feedback = normalizeMarketplaceText(reviewFeedbackPublic);

  switch (approvalStatus) {
    case "pending_review":
      return feedback ?? "Your profile is under review and is not yet publicly searchable.";
    case "approved":
      return feedback ?? "Your profile is live on Elevare.";
    case "rejected":
      return feedback ?? "Your profile needs changes before it can be published.";
    case "suspended":
      return feedback ?? "Your profile is currently not visible. Contact support if you need help.";
    case "inactive":
      return feedback ?? "Your profile is inactive and not publicly visible.";
    case "draft":
    default:
      return feedback ?? "Complete your profile and submit it for review.";
  }
}

export function buildProfessionalPath(slug: string) {
  return `/professionals/${slug}`;
}

export function getProfessionalInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "EF";
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export function sanitizeProfessionalSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildProfessionalSlugFromName(name: string) {
  return sanitizeProfessionalSlug(name);
}

export function formatLocationLabel(professional: ProfessionalProfileRecord) {
  const location = formatMarketplaceLocation({
    city: professional.city,
    region: professional.state,
    countryCode: professional.countryCode,
  });

  if (location) return location;

  if (professional.remoteAvailable || professional.serviceModes.includes("online")) {
    return "Online";
  }

  return "Location flexible";
}

export function formatPublicLocationLabel(professional: ProfessionalProfileRecord) {
  const location = formatPublicLocation({
    city: professional.city,
    region: professional.state,
    countryCode: professional.countryCode,
  });

  if (location) return location;

  if (isOnlineOnlyMarketplaceProfessional(professional)) {
    return "Online";
  }

  return "Location flexible";
}

export function formatYearsExperience(value: number | null) {
  if (!value || value <= 0) {
    return null;
  }

  return `${value}+ year${value === 1 ? "" : "s"} experience`;
}

export function formatPriceSummary({
  priceFrom,
  priceTo,
  pricingBasis,
  contactForPricing,
  pricingCurrency = "USD",
}: Pick<ProfessionalProfileRecord, "priceFrom" | "priceTo" | "pricingBasis" | "pricingCurrency" | "contactForPricing">) {
  if (contactForPricing) {
    return "Contact for pricing";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: pricingCurrency || "USD",
    maximumFractionDigits: 0,
  });

  const basis = normalizeMarketplaceText(pricingBasis);

  if (priceFrom != null && priceTo != null && priceTo > priceFrom) {
    return `${formatter.format(priceFrom)}-${formatter.format(priceTo)}${basis ? `/${basis}` : ""}`;
  }

  if (priceFrom != null) {
    return `From ${formatter.format(priceFrom)}${basis ? `/${basis}` : ""}`;
  }

  return null;
}

export function formatServicePriceSummary({
  price,
  priceTo,
  pricingBasis,
  contactForPricing,
  currencyCode,
}: Pick<ProfessionalServiceRecord, "price" | "priceTo" | "pricingBasis" | "contactForPricing" | "currencyCode">) {
  if (contactForPricing) return "Contact for pricing";
  if (price == null) return null;

  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode || "USD",
    maximumFractionDigits: 0,
  });
  const basis = normalizeMarketplaceText(pricingBasis);
  const suffix = basis ? `/${basis}` : "";

  if (priceTo != null && priceTo > price) {
    return `${formatter.format(price)}-${formatter.format(priceTo)}${suffix}`;
  }

  return `${formatter.format(price)}${suffix}`;
}

export function hasVerifiedCredential(credentials: ProfessionalCredentialRecord[]) {
  return credentials.some(
    (credential) =>
      credential.verificationStatus === "verified" && !isCredentialExpired(credential.expirationDate),
  );
}

export function isCredentialExpired(expirationDate: string | null | undefined) {
  const normalized = normalizeMarketplaceText(expirationDate);

  if (!normalized) {
    return false;
  }

  const expirationTime = Date.parse(normalized);

  if (!Number.isFinite(expirationTime)) {
    return false;
  }

  const comparisonDate = new Date();
  comparisonDate.setHours(0, 0, 0, 0);

  return expirationTime < comparisonDate.getTime();
}

export function getCredentialPublicStatus(credential: ProfessionalCredentialRecord) {
  if (isCredentialExpired(credential.expirationDate)) {
    return {
      label: "Credential expired",
      tone: "warning" as const,
    };
  }

  switch (credential.verificationStatus) {
    case "verified":
      return {
        label: "Credential verified",
        tone: "success" as const,
      };
    case "expired":
      return {
        label: "Credential expired",
        tone: "warning" as const,
      };
    // Internal review states are not public allegations. Until a specific
    // credential passes review, the public claim remains simply "claimed."
    case "pending":
    case "rejected":
    case "unverified":
    default:
      return {
        label: "Claimed credential",
        tone: "neutral" as const,
      };
  }
}

export function getProfessionalPublicBadges(professional: ProfessionalProfileRecord) {
  const badges: string[] = [];
  const trust = professional.trustSummary;

  if (trust?.profileReviewed === true) {
    badges.push("Profile reviewed");
  }

  if (trust?.identityVerified === true) {
    badges.push("Identity verified");
  }

  if (trust?.backgroundCheckCompleted === true) {
    badges.push("Background check completed");
  }

  if (trust?.insuranceConfirmed === true) {
    badges.push("Insurance confirmed");
  }

  return badges.slice(0, 2);
}

export function getPrimaryCategory(professional: ProfessionalProfileRecord) {
  return professional.categories.find((category) => category.isPrimary) ?? professional.categories[0] ?? null;
}

export function formatCategoryList(categories: ProfessionalCategoryRecord[]) {
  return categories.map((category) => category.label).join(", ");
}

export function buildProfessionalSearchText(professional: ProfessionalProfileRecord) {
  return [
    professional.displayName,
    professional.professionalTitle,
    professional.publicHeadline,
    professional.bestFitSummary,
    professional.bio,
    professional.city,
    professional.state,
    getRegionDisplayName(professional.countryCode, professional.state),
    professional.countryCode,
    getCountryDisplayName(professional.countryCode),
    professional.serviceArea,
    professional.specialties.join(" "),
    professional.goalTags.join(" "),
    professional.experienceLevelsServed.join(" "),
    professional.coachingStyle,
    professional.categories.map((category) => category.label).join(" "),
    professional.services.map((service) => [
      service.name,
      service.intendedFor,
      service.deliveryCadence,
      service.includedItems.join(" "),
    ].filter(Boolean).join(" ")).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function professionalSupportsServiceMode(
  professional: ProfessionalProfileRecord,
  serviceMode: string | null | undefined,
) {
  const normalizedServiceMode = normalizeMarketplaceText(serviceMode);

  if (!normalizedServiceMode || normalizedServiceMode === "all") {
    return true;
  }

  if (normalizedServiceMode === "online") {
    return professional.remoteAvailable
      || professional.serviceModes.includes("online")
      || professional.serviceModes.includes("hybrid");
  }

  if (normalizedServiceMode === "in_person") {
    return professional.serviceModes.includes("in_person") || professional.serviceModes.includes("hybrid");
  }

  if (normalizedServiceMode === "hybrid") {
    return professional.serviceModes.includes("hybrid");
  }

  return professional.serviceModes.includes(normalizedServiceMode);
}

function professionalMatchesCategory(
  professional: ProfessionalProfileRecord,
  categorySlug: string | null | undefined,
) {
  const normalizedCategory = normalizeMarketplaceText(categorySlug);

  if (!normalizedCategory || normalizedCategory === "all") {
    return true;
  }

  return professional.categories.some((category) => category.slug === normalizedCategory);
}

function professionalMatchesSpecialty(
  professional: ProfessionalProfileRecord,
  specialty: string | null | undefined,
) {
  const normalizedSpecialty = normalizeMarketplaceText(specialty)?.toLowerCase();

  if (!normalizedSpecialty || normalizedSpecialty === "all") {
    return true;
  }

  const specialtyHaystack = [
    ...professional.specialties,
    ...professional.services.map((service) => service.name),
  ]
    .join(" ")
    .toLowerCase();

  return specialtyHaystack.includes(normalizedSpecialty);
}

function professionalMatchesLocation(
  professional: ProfessionalProfileRecord,
  location: string | null | undefined,
) {
  const parsedLocation = parseMarketplaceLocationLabel(location);

  if (!parsedLocation) {
    return true;
  }

  if (parsedLocation.isOnline) {
    return professionalSupportsServiceMode(professional, "online");
  }

  const profileLocation = [
    professional.city,
    professional.state,
    getRegionDisplayName(professional.countryCode, professional.state),
    professional.countryCode,
    getCountryDisplayName(professional.countryCode),
    professional.serviceArea,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return profileLocation.includes(parsedLocation.raw.toLowerCase());
}

function professionalMatchesBroaderLocation(
  professional: ProfessionalProfileRecord,
  location: string | null | undefined,
) {
  const parsedLocation = parseMarketplaceLocationLabel(location);

  if (!parsedLocation || parsedLocation.isOnline) {
    return false;
  }

  const professionalCity = normalizeMarketplaceText(professional.city)?.toLowerCase() ?? null;
  const professionalState = normalizeMarketplaceText(professional.state)?.toLowerCase() ?? null;
  const professionalRegion = normalizeMarketplaceText(
    getRegionDisplayName(professional.countryCode, professional.state),
  )?.toLowerCase() ?? null;
  const serviceArea = normalizeMarketplaceText(professional.serviceArea)?.toLowerCase() ?? null;

  if (parsedLocation.city && professionalCity && parsedLocation.city === professionalCity) {
    return true;
  }

  if (
    parsedLocation.state
    && (parsedLocation.state === professionalState || parsedLocation.state === professionalRegion)
  ) {
    return true;
  }

  if (parsedLocation.city && serviceArea && serviceArea.includes(parsedLocation.city)) {
    return true;
  }

  return false;
}

export function getProfessionalCompletenessScore(professional: ProfessionalProfileRecord) {
  if (Number.isFinite(professional.directoryCompletenessScore)) {
    return professional.directoryCompletenessScore ?? 0;
  }

  let score = 0;

  if (professional.profilePhotoUrl) {
    score += 4;
  }

  if (normalizeMarketplaceText(professional.professionalTitle)) {
    score += 2;
  }

  if (normalizeMarketplaceText(professional.bio)) {
    score += 3;
  }

  if (professional.categories.length > 0) {
    score += 2;
  }

  if (professional.specialties.length > 0) {
    score += Math.min(2, professional.specialties.length * 0.5);
  }

  if (professional.serviceModes.length > 0) {
    score += 1;
  }

  if (professional.priceFrom != null) {
    score += 1;
  }

  if (normalizeMarketplaceText(professional.availabilitySummary)) {
    score += 1;
  }

  if (getProfessionalPublicBadges(professional).length > 0) {
    score += 1;
  }

  return score;
}

function getProfessionalAcceptanceScore(professional: ProfessionalProfileRecord) {
  switch (professional.clientAcceptanceStatus) {
    case "accepting":
      return 100;
    case "waitlist":
      return 30;
    case "not_accepting":
      return 0;
    default:
      return 10;
  }
}

function getProfessionalAvailabilityScore(professional: ProfessionalProfileRecord) {
  const confirmedAt = Date.parse(professional.availabilityConfirmedAt ?? "");

  if (!Number.isFinite(confirmedAt)) {
    return 0;
  }

  // A monotonic timestamp signal keeps server and client ordering identical.
  return Math.min(8, confirmedAt / 1_000_000_000_000 * 4);
}

function getProfessionalTrustScore(professional: ProfessionalProfileRecord) {
  const trust = professional.trustSummary;
  if (!trust) return 0;

  return Math.min(6, [
    trust.profileReviewed,
    trust.identityVerified,
    trust.backgroundCheckCompleted,
    trust.insuranceConfirmed,
    trust.accountInGoodStanding,
  ].filter(Boolean).length * 1.5);
}

function getProfessionalTimestamp(professional: ProfessionalProfileRecord) {
  const timestamp = Date.parse(professional.updatedAt ?? professional.createdAt ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getProfessionalRankingScore(
  professional: ProfessionalProfileRecord,
  options: ProfessionalSortOptions = {},
) {
  let score = getProfessionalAcceptanceScore(professional)
    + getProfessionalCompletenessScore(professional) * 4
    + getProfessionalAvailabilityScore(professional)
    + getProfessionalTrustScore(professional);

  if (options.preferredCategorySlug && professionalMatchesCategory(professional, options.preferredCategorySlug)) {
    score += 32;
  }

  if (options.preferredLocation) {
    if (professionalMatchesLocation(professional, options.preferredLocation)) {
      score += 20;
    } else if (professionalMatchesBroaderLocation(professional, options.preferredLocation)) {
      score += 12;
    }
  }

  if (options.preferredServiceMode && professionalSupportsServiceMode(professional, options.preferredServiceMode)) {
    score += 14;
  }

  if (options.preferOnline && professionalSupportsServiceMode(professional, "online")) {
    score += 10;
  }

  if (
    options.referenceSearchText
    && buildProfessionalSearchText(professional).includes(options.referenceSearchText.trim().toLowerCase())
  ) {
    score += 8;
  }

  const lastUpdated = getProfessionalTimestamp(professional);

  if (lastUpdated > 0) {
    score += Math.min(4, lastUpdated / 1_000_000_000_000 * 2);
  }

  return score;
}

function hashMarketplaceSeed(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getRelatedMarketplaceCategorySlugs(categorySlug: string | null | undefined) {
  const normalizedCategory = normalizeMarketplaceText(categorySlug);

  if (!normalizedCategory) {
    return [];
  }

  return MARKETPLACE_CATEGORY_RELATED_PUBLIC_SLUGS[normalizedCategory] ?? [];
}

export function matchesProfessionalFilters(
  professional: ProfessionalProfileRecord,
  filters: ProfessionalDirectoryFilters,
) {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const normalizedCategory = normalizeMarketplaceText(filters.category);
  const normalizedLocation = normalizeMarketplaceText(filters.location)?.toLowerCase() ?? null;
  const normalizedServiceMode = normalizeMarketplaceText(filters.serviceMode);
  const normalizedSpecialty = normalizeMarketplaceText(filters.specialty)?.toLowerCase() ?? null;

  if (normalizedCategory && normalizedCategory !== "all") {
    if (!professionalMatchesCategory(professional, normalizedCategory)) {
      return false;
    }
  }

  if (normalizedLocation && normalizedLocation !== "all") {
    if (!professionalMatchesLocation(professional, normalizedLocation)) {
      return false;
    }
  }

  if (normalizedServiceMode && normalizedServiceMode !== "all") {
    if (!professionalSupportsServiceMode(professional, normalizedServiceMode)) {
      return false;
    }
  }

  if (normalizedSpecialty && normalizedSpecialty !== "all") {
    if (!professionalMatchesSpecialty(professional, normalizedSpecialty)) {
      return false;
    }
  }

  if (normalizedQuery) {
    return buildProfessionalSearchText(professional).includes(normalizedQuery);
  }

  return true;
}

export function filterProfessionals(
  professionals: ProfessionalProfileRecord[],
  filters: ProfessionalDirectoryFilters,
) {
  return professionals.filter((professional) => matchesProfessionalFilters(professional, filters));
}

export function sortProfessionals(
  professionals: ProfessionalProfileRecord[],
  options: ProfessionalSortOptions = {},
) {
  return [...professionals].sort((left, right) => {
    const scoreDifference =
      getProfessionalRankingScore(right, options) - getProfessionalRankingScore(left, options);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    const timestampDifference = getProfessionalTimestamp(right) - getProfessionalTimestamp(left);

    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    const experienceDifference = (right.yearsExperience ?? 0) - (left.yearsExperience ?? 0);

    if (experienceDifference !== 0) {
      return experienceDifference;
    }

    return left.displayName.localeCompare(right.displayName);
  });
}

export function sortProfessionalsWithRandomizedTies(
  professionals: ProfessionalProfileRecord[],
  options: ProfessionalSortOptions = {},
  seed = "",
) {
  return [...professionals]
    .map((professional, index) => ({
      professional,
      // Half-point tiers preserve meaningful relevance differences while
      // allowing fair rotation when freshness timestamps differ only slightly.
      matchScore: Math.round(getProfessionalRankingScore(professional, options) * 2) / 2,
      randomWeight: hashMarketplaceSeed(`${professional.profileSlug}:${seed}`),
      index,
    }))
    .sort((left, right) => {
      const matchDifference = right.matchScore - left.matchScore;

      if (matchDifference !== 0) {
        return matchDifference;
      }

      const randomDifference = left.randomWeight - right.randomWeight;

      if (randomDifference !== 0) {
        return randomDifference;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.professional);
}

export function hasMeaningfulMarketplaceSearch(
  filters: ProfessionalDirectoryFilters,
  fixedCategorySlug?: string,
) {
  return Boolean(
    filters.query.trim()
    || filters.location !== "all"
    || filters.serviceMode !== "all"
    || filters.specialty !== "all"
    || (!fixedCategorySlug && filters.category !== "all"),
  );
}

export function buildProfessionalFallbackGroups({
  professionals,
  filters,
  exactResults,
  limit = 4,
}: BuildProfessionalFallbackGroupsOptions): ProfessionalFallbackGroup[] {
  const categorySlug = normalizeMarketplaceText(filters.category);
  const location = normalizeMarketplaceText(filters.location);
  const serviceMode = normalizeMarketplaceText(filters.serviceMode);
  const specialty = normalizeMarketplaceText(filters.specialty);
  const query = normalizeMarketplaceText(filters.query)?.toLowerCase() ?? null;
  const excludedProfessionalIds = new Set(exactResults.map((professional) => professional.id));
  const fallbackGroups: ProfessionalFallbackGroup[] = [];

  const addGroup = (
    key: ProfessionalFallbackGroupKey,
    title: string,
    description: string,
    candidates: ProfessionalProfileRecord[],
  ) => {
    const groupProfessionals = candidates.filter((professional) => !excludedProfessionalIds.has(professional.id));

    if (groupProfessionals.length === 0) {
      return;
    }

    fallbackGroups.push({
      key,
      title,
      description,
      professionals: groupProfessionals,
    });

    groupProfessionals.forEach((professional) => excludedProfessionalIds.add(professional.id));
  };

  const hasExplicitLocalLocation = Boolean(
    location && location.toLowerCase() !== "all" && location.toLowerCase() !== "online",
  );
  const requiresInPerson = serviceMode === "in_person";

  if (!requiresInPerson && !hasExplicitLocalLocation) {
    addGroup(
      "online",
      "Available Online",
      "These published profiles can work with you online, so location becomes less restrictive.",
      sortProfessionals(
        professionals.filter((professional) =>
          professionalMatchesCategory(professional, categorySlug)
          && professionalSupportsServiceMode(professional, "online")
        ),
        {
          preferredCategorySlug: categorySlug,
          preferredServiceMode: "online",
          preferOnline: true,
          referenceSearchText: specialty?.toLowerCase() ?? query,
        },
      ).slice(0, limit),
    );
  }

  const relatedCategorySlugs = getRelatedMarketplaceCategorySlugs(categorySlug);

  addGroup(
    "similar",
    "Similar Services",
    "These categories are closely related to what you searched for and may still be a strong fit.",
    sortProfessionals(
      professionals.filter((professional) => {
        const matchesRelatedCategory =
          relatedCategorySlugs.length > 0
          && professional.categories.some((category) => relatedCategorySlugs.includes(category.slug));
        const matchesRequestedSpecialty = specialty ? professionalMatchesSpecialty(professional, specialty) : false;
        const matchesRequestedQuery = query ? buildProfessionalSearchText(professional).includes(query) : false;

        const matchesRelatedNeed = matchesRelatedCategory || matchesRequestedSpecialty || matchesRequestedQuery;
        const matchesRequiredMode = !serviceMode || serviceMode === "all"
          || professionalSupportsServiceMode(professional, serviceMode);
        const matchesRequiredLocation = !hasExplicitLocalLocation
          || professionalMatchesLocation(professional, location);

        return matchesRelatedNeed && matchesRequiredMode && matchesRequiredLocation;
      }),
      {
        preferredServiceMode: serviceMode,
        referenceSearchText: specialty?.toLowerCase() ?? query,
      },
    ).slice(0, limit),
  );

  return fallbackGroups;
}

export function getUniqueLocations(professionals: ProfessionalProfileRecord[]) {
  const locations = new Set<string>();

  for (const professional of professionals) {
    const location = formatMarketplaceLocation({
      city: professional.city,
      region: professional.state,
      countryCode: professional.countryCode,
    });
    if (location) locations.add(location);

    if (professional.remoteAvailable || professional.serviceModes.includes("online")) {
      locations.add("Online");
    }
  }

  return [...locations].sort((left, right) => left.localeCompare(right));
}

export function getUniqueSpecialties(professionals: ProfessionalProfileRecord[]) {
  const specialties = new Set<string>();

  for (const professional of professionals) {
    professional.specialties.forEach((specialty) => {
      const normalized = normalizeMarketplaceText(specialty);

      if (normalized) {
        specialties.add(normalized);
      }
    });
  }

  return [...specialties].sort((left, right) => left.localeCompare(right));
}

export function getCategoryBySlug(categories: ProfessionalCategoryRecord[], slug: string) {
  return categories.find((category) => category.slug === slug) ?? null;
}

export function getProfessionalBySlug(professionals: ProfessionalProfileRecord[], slug: string) {
  return professionals.find((professional) => professional.profileSlug === slug) ?? null;
}

export function getProfessionalsByCategory(
  professionals: ProfessionalProfileRecord[],
  categorySlug: string,
) {
  return professionals.filter((professional) =>
    professional.categories.some((category) => category.slug === categorySlug),
  );
}

export function getRelatedProfessionals(
  professional: ProfessionalProfileRecord,
  professionals: ProfessionalProfileRecord[],
  limit = 3,
) {
  const categorySlugs = new Set(professional.categories.map((category) => category.slug));
  const specialties = new Set(professional.specialties.map((specialty) => specialty.toLowerCase()));

  return sortProfessionals(
    professionals.filter((candidate) => {
      if (candidate.id === professional.id) {
        return false;
      }

      const sharesCategory = candidate.categories.some((category) => categorySlugs.has(category.slug));
      const sharesSpecialty = candidate.specialties.some((specialty) =>
        specialties.has(specialty.toLowerCase()),
      );

      return sharesCategory || sharesSpecialty;
    }),
  ).slice(0, limit);
}

export function buildProfessionalSummary(professional: ProfessionalProfileRecord) {
  const primaryCategory = getPrimaryCategory(professional)?.label ?? "Profile";
  const location = formatLocationLabel(professional);
  const title = normalizeMarketplaceText(professional.professionalTitle) ?? primaryCategory;

  return `${professional.displayName} is listed on Elevare as ${title} serving ${location}.`;
}

export function buildCategoryFaqs(category: ProfessionalCategoryRecord) {
  return buildMarketplaceCategoryFaqs(category.slug);
}

export function buildCategoryIntro(category: ProfessionalCategoryRecord) {
  const taxonomy = getMarketplaceTaxonomyCategoryByPublicSlug(category.slug);
  const specialtyExamples = taxonomy?.specialties.slice(0, 4).join(", ");
  const categoryDescription = category.shortDescription ?? category.headline;

  return `${categoryDescription} Browse published profiles on Elevare and compare specialties, service modes, location coverage, and pricing context before reaching out.${
    specialtyExamples ? ` Common focus areas include ${specialtyExamples}.` : ""
  }`;
}

export function isMarketplaceSnapshotPopulated(snapshot: MarketplaceSnapshot) {
  return snapshot.categories.length > 0 || snapshot.professionals.length > 0;
}

export const MARKETPLACE_SOCIAL_PROOF_MINIMUM = 500;

export function countEligibleMarketplaceProfiles(professionals: ProfessionalProfileRecord[]) {
  return professionals.filter(isPublicMarketplaceProfessional).length;
}

export function getMarketplaceResultCountBand(count: number): MarketplaceResultCountBand {
  if (count <= 0) return "zero";
  if (count === 1) return "one";
  if (count <= 3) return "two_to_three";
  if (count <= 10) return "four_to_ten";
  return "more_than_ten";
}

export function getMarketplaceCategorySupply(
  categories: ProfessionalCategoryRecord[],
  professionals: ProfessionalProfileRecord[],
) {
  return categories.map((category): MarketplaceCategorySupply => {
    const listed = professionals.filter((professional) =>
      professional.categories.some((candidate) => candidate.slug === category.slug),
    );

    return {
      category,
      listedCount: listed.length,
      acceptingCount: listed.filter((professional) => professional.clientAcceptanceStatus === "accepting").length,
    };
  });
}

export function toProfessionalDirectoryRecord(
  professional: ProfessionalProfileRecord,
): ProfessionalProfileRecord {
  return {
    ...professional,
    id: professional.profileSlug,
    directoryCompletenessScore: getProfessionalCompletenessScore(professional),
    bio: "",
    postalCode: null,
    serviceRadiusMeters: null,
    serviceBoundaries: null,
    consultationExpectations: null,
    availabilityDetails: null,
    websiteUrl: null,
    socialLinks: {},
    ...(professional.reviewFeedbackPublic !== undefined ? { reviewFeedbackPublic: null } : {}),
    credentials: [],
    services: [],
  };
}

export function toProfessionalDirectoryRecords(professionals: ProfessionalProfileRecord[]) {
  return professionals.filter(isPublicMarketplaceProfessional).map(toProfessionalDirectoryRecord);
}

export function getMarketplaceRotationSeed(scope: string, date = new Date()) {
  return `${scope}:${date.toISOString().slice(0, 10)}`;
}

function getEligibleCategoryProfessionalCount(
  category: ProfessionalCategoryRecord,
  professionals: ProfessionalProfileRecord[],
) {
  return getMarketplaceCategoryProfessionalCount(category, professionals);
}

export function formatMarketplaceSocialProofCount(eligibleProfileCount: number) {
  if (eligibleProfileCount < MARKETPLACE_SOCIAL_PROOF_MINIMUM) {
    return null;
  }

  if (eligibleProfileCount < 1000) {
    return `${MARKETPLACE_SOCIAL_PROOF_MINIMUM.toLocaleString()}+ profiles`;
  }

  const step = eligibleProfileCount < 5000 ? 500 : 1000;
  const milestone = Math.floor(eligibleProfileCount / step) * step;

  return `${milestone.toLocaleString()}+ profiles`;
}

export function selectMarketplaceCategoryCards(
  categories: ProfessionalCategoryRecord[],
  professionals: ProfessionalProfileRecord[],
  limit = 8,
) {
  const safeLimit = Math.max(0, limit);

  if (safeLimit === 0 || categories.length === 0) {
    return [];
  }

  return getMarketplaceCategorySupply(categories, professionals)
    .filter((entry) => entry.listedCount > 0)
    .sort((left, right) =>
      right.acceptingCount - left.acceptingCount
      || right.listedCount - left.listedCount
      || left.category.sortOrder - right.category.sortOrder,
    )
    .slice(0, safeLimit)
    .map((entry) => entry.category);
}

export function findTopCategories(
  categories: ProfessionalCategoryRecord[],
  professionals: ProfessionalProfileRecord[],
  limit = 6,
) {
  return [...categories]
    .map((category) => ({
      category,
      count: getEligibleCategoryProfessionalCount(category, professionals),
    }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.category.sortOrder - right.category.sortOrder)
    .slice(0, limit)
    .map((entry) => entry.category);
}

export function buildProfessionalSchema(professional: ProfessionalProfileRecord, siteUrl: string) {
  const countryCode = normalizeCountryCode(professional.countryCode, "");
  const areaServed = isOnlineOnlyMarketplaceProfessional(professional)
    ? "Online"
    : (
        professional.serviceArea
        ?? formatPublicLocation({
          city: professional.city,
          region: professional.state,
          countryCode,
        })
      ) || undefined;
  const address = professional.city || professional.state
    ? {
        "@type": "PostalAddress",
        addressLocality: professional.city ?? undefined,
        addressRegion: getRegionDisplayName(countryCode, professional.state) || undefined,
        addressCountry: countryCode || undefined,
      }
    : undefined;
  const offers = professional.services
    .filter((service) => service.isActive)
    .map((service) => ({
      "@type": "Offer",
      name: service.name,
      description: service.description ?? undefined,
      price: service.price ?? undefined,
      priceCurrency: service.price != null ? service.currencyCode : undefined,
    }));
  const credentials = professional.credentials
    .filter((credential) => credential.verificationStatus === "verified")
    .map((credential) => ({
      "@type": "EducationalOccupationalCredential",
      name: credential.credentialName,
      recognizedBy: {
        "@type": "Organization",
        name: credential.organizationName,
      },
    }));

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: professional.displayName,
    jobTitle: professional.professionalTitle,
    description: professional.publicHeadline ?? professional.bestFitSummary ?? professional.bio,
    image: professional.profilePhotoUrl ?? undefined,
    url: `${siteUrl}/professionals/${professional.profileSlug}/`,
    areaServed,
    knowsAbout: [...new Set([...professional.specialties, ...professional.goalTags])],
    ...((professional.languages ?? []).length > 0 ? { knowsLanguage: professional.languages } : {}),
    address,
    ...(offers.length > 0 ? { makesOffer: offers } : {}),
    ...(credentials.length > 0 ? { hasCredential: credentials } : {}),
  };
}

export function buildDirectorySchema(
  categories: ProfessionalCategoryRecord[],
  professionals: ProfessionalProfileRecord[],
  siteUrl: string,
) {
  const publicProfessionals = professionals.filter(isPublicMarketplaceProfessional).slice(0, 24);

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Elevare Professional Directory",
    url: `${siteUrl}/professionals/`,
    ...(publicProfessionals.length > 0
      ? {
          mainEntity: {
            "@type": "ItemList",
            itemListElement: publicProfessionals.map((professional, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: professional.displayName,
              url: `${siteUrl}/professionals/${professional.profileSlug}/`,
            })),
          },
        }
      : {}),
    about: categories.map((category) => category.label),
  };
}
