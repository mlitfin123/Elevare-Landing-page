import type {
  MarketplaceSnapshot,
  ProfessionalCategoryRecord,
  ProfessionalCredentialRecord,
  ProfessionalProfileRecord,
} from "@/lib/marketplace-types";
import { MARKETPLACE_CATEGORY_RELATED_PUBLIC_SLUGS } from "@/lib/marketplace-taxonomy";

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
  const city = normalizeMarketplaceText(professional.city);
  const state = normalizeMarketplaceText(professional.state);

  if (city && state) {
    return `${city}, ${state}`;
  }

  if (city) {
    return city;
  }

  if (state) {
    return state;
  }

  if (professional.remoteAvailable || professional.serviceModes.includes("online")) {
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
  pricingCurrency = "USD",
}: Pick<ProfessionalProfileRecord, "priceFrom" | "priceTo" | "pricingBasis" | "pricingCurrency">) {
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
    case "rejected":
      return {
        label: "Credential not verified",
        tone: "neutral" as const,
      };
    case "pending":
      return {
        label: "Credential under review",
        tone: "neutral" as const,
      };
    case "expired":
      return {
        label: "Credential expired",
        tone: "warning" as const,
      };
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

  if (professional.identityVerificationStatus === "verified") {
    badges.push("Identity verified");
  }

  if (hasVerifiedCredential(professional.credentials)) {
    badges.push("Credential verified");
  }

  return badges;
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
    professional.bio,
    professional.city,
    professional.state,
    professional.serviceArea,
    professional.specialties.join(" "),
    professional.categories.map((category) => category.label).join(" "),
    professional.services.map((service) => service.name).join(" "),
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

  const profileLocation = [professional.city, professional.state, professional.serviceArea]
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
  const serviceArea = normalizeMarketplaceText(professional.serviceArea)?.toLowerCase() ?? null;

  if (parsedLocation.city && professionalCity && parsedLocation.city === professionalCity) {
    return true;
  }

  if (parsedLocation.state && professionalState && parsedLocation.state === professionalState) {
    return true;
  }

  if (parsedLocation.city && serviceArea && serviceArea.includes(parsedLocation.city)) {
    return true;
  }

  return false;
}

function getProfessionalCompletenessScore(professional: ProfessionalProfileRecord) {
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

function getProfessionalTimestamp(professional: ProfessionalProfileRecord) {
  const timestamp = Date.parse(professional.updatedAt ?? professional.createdAt ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getProfessionalRankingScore(
  professional: ProfessionalProfileRecord,
  options: ProfessionalSortOptions = {},
) {
  let score = getProfessionalCompletenessScore(professional) * 4;

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

  score += Math.min(professional.yearsExperience ?? 0, 20) / 2;

  const lastUpdated = getProfessionalTimestamp(professional);

  if (lastUpdated > 0) {
    score += Math.min(lastUpdated / 1000_000_000_000, 4);
  }

  return score;
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

  if (location && location.toLowerCase() !== "online") {
    addGroup(
      "nearby",
      "Nearby",
      "These are the closest local alternatives we have right now while keeping the service fit as close as possible.",
      sortProfessionals(
        professionals.filter((professional) =>
          professionalMatchesCategory(professional, categorySlug)
          && professionalMatchesBroaderLocation(professional, location)
          && (!serviceMode || serviceMode === "online" || professionalSupportsServiceMode(professional, serviceMode))
        ),
        {
          preferredCategorySlug: categorySlug,
          preferredLocation: location,
          preferredServiceMode: serviceMode,
          referenceSearchText: specialty?.toLowerCase() ?? query,
        },
      ).slice(0, limit),
    );
  }

  addGroup(
    "online",
    "Available Online",
    "These reviewed profiles can work with you online, so location becomes less restrictive.",
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

        return matchesRelatedCategory || matchesRequestedSpecialty || matchesRequestedQuery;
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
    if (professional.city && professional.state) {
      locations.add(`${professional.city}, ${professional.state}`);
    } else if (professional.city) {
      locations.add(professional.city);
    } else if (professional.state) {
      locations.add(professional.state);
    }

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
  return [
    {
      question: `What should I look for before hiring ${category.label.toLowerCase()}?`,
      answer:
        "Start with category fit, service mode, specialties, pricing structure, and whether that person's communication style feels aligned with your goals.",
    },
    {
      question: `Can I browse ${category.label.toLowerCase()} before creating an account?`,
      answer:
        "Yes. The public directory and reviewed profiles are open to browse before you sign in.",
    },
    {
      question: `Do all ${category.label.toLowerCase()} work the same way?`,
      answer:
        "No. Some offer in-person sessions, some work online, and others use hybrid models with very different pricing and service structures.",
    },
    {
      question: `How do I request a consultation on Elevare?`,
      answer:
        "Open a profile, click Request Consultation, and send a short inquiry. The person you contact can review the request inside their Elevare account.",
    },
  ];
}

export function buildCategoryIntro(category: ProfessionalCategoryRecord) {
  return `${category.label} on Elevare are listed so people can compare fit more clearly before reaching out. Use the directory to review specialties, service modes, location coverage, pricing context, and whether someone looks like the right match for your goals.`;
}

export function isMarketplaceSnapshotPopulated(snapshot: MarketplaceSnapshot) {
  return snapshot.categories.length > 0 || snapshot.professionals.length > 0;
}

export const MARKETPLACE_SOCIAL_PROOF_MINIMUM = 500;

export function countEligibleMarketplaceProfiles(professionals: ProfessionalProfileRecord[]) {
  return professionals.filter((professional) => professional.approvalStatus === "approved" && professional.isActive)
    .length;
}

function getEligibleCategoryProfessionalCount(
  category: ProfessionalCategoryRecord,
  professionals: ProfessionalProfileRecord[],
) {
  return professionals.filter((professional) =>
    professional.approvalStatus === "approved"
    && professional.isActive
    && professional.categories.some((entry) => entry.slug === category.slug),
  ).length;
}

function shuffleMarketplaceCategories(categories: ProfessionalCategoryRecord[]) {
  const shuffled = [...categories];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
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
  guaranteedTopCount = 2,
) {
  const safeLimit = Math.max(0, limit);

  if (safeLimit === 0 || categories.length === 0) {
    return [];
  }

  const rankedCategories = [...categories]
    .map((category) => ({
      category,
      count: getEligibleCategoryProfessionalCount(category, professionals),
    }))
    .sort((left, right) => right.count - left.count || left.category.sortOrder - right.category.sortOrder);

  const guaranteedCategories = rankedCategories
    .slice(0, Math.min(safeLimit, Math.max(0, guaranteedTopCount)))
    .map((entry) => entry.category);
  const guaranteedSlugs = new Set(guaranteedCategories.map((category) => category.slug));
  const randomPool = shuffleMarketplaceCategories(
    categories.filter((category) => !guaranteedSlugs.has(category.slug)),
  );
  const selectedCategories = [
    ...guaranteedCategories,
    ...randomPool.slice(0, Math.max(0, safeLimit - guaranteedCategories.length)),
  ];

  return shuffleMarketplaceCategories(selectedCategories);
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
    .sort((left, right) => right.count - left.count || left.category.sortOrder - right.category.sortOrder)
    .slice(0, limit)
    .map((entry) => entry.category);
}

export function buildProfessionalSchema(professional: ProfessionalProfileRecord, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: professional.displayName,
    jobTitle: professional.professionalTitle,
    description: professional.bio,
    image: professional.profilePhotoUrl ?? undefined,
    url: `${siteUrl}/professionals/${professional.profileSlug}/`,
    areaServed: formatLocationLabel(professional),
    knowsAbout: professional.specialties,
  };
}

export function buildDirectorySchema(
  categories: ProfessionalCategoryRecord[],
  professionals: ProfessionalProfileRecord[],
  siteUrl: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Elevare Professional Directory",
    url: `${siteUrl}/professionals/`,
    hasPart: professionals.slice(0, 24).map((professional, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: professional.displayName,
      url: `${siteUrl}/professionals/${professional.profileSlug}/`,
    })),
    about: categories.map((category) => category.label),
  };
}
