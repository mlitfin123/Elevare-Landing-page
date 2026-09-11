import { buildAvailabilitySummaryText, humanizeMarketplaceValue } from "./marketplace-account.ts";
import { MARKETPLACE_CATEGORY_SEEDS } from "./marketplace-categories.ts";
import {
  getMarketplaceLegacyCategoryMapping,
  resolveMarketplaceCategoryTaxonomy,
} from "./marketplace-taxonomy.ts";
import {
  type MarketplaceSnapshot,
  type ProfessionalCategoryRecord,
  type ProfessionalCredentialRecord,
  type ProfessionalServiceRecord,
} from "./marketplace-types.ts";
import {
  getDefaultCurrencyCode,
  normalizeCountryCode,
  normalizeCurrencyCode,
} from "./marketplace-location.ts";

export type MarketplaceCategoryRow = {
  id: string;
  slug: string;
  public_slug: string | null;
  label: string;
  headline: string;
  short_description: string | null;
  sort_order: number | null;
  internal_description: string | null;
};

export type MarketplaceCategoryJson = {
  id: string | null;
  slug: string | null;
  stable_slug?: string | null;
  public_slug?: string | null;
  label: string | null;
  headline: string | null;
  short_description: string | null;
  is_primary?: boolean | null;
};

export type MarketplaceCredentialJson = {
  id: string;
  credential_name: string;
  credential_type: string | null;
  issuing_body: string | null;
  credential_number: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  verification_status: string | null;
  credential_country_code?: string | null;
  credential_jurisdiction?: string | null;
};

export type MarketplaceServiceJson = {
  id: string;
  name: string;
  description: string | null;
  service_mode: string | null;
  duration_minutes: number | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  pricing_basis: string | null;
  contact_for_pricing: boolean | null;
  sort_order: number | null;
  is_active: boolean | null;
  currency_code?: string | null;
  intended_for?: string | null;
  included_items?: string[] | null;
  delivery_cadence?: string | null;
  minimum_commitment?: string | null;
  consultation_type?: string | null;
  additional_costs_note?: string | null;
};

export type MarketplaceLocationJson = {
  location_name?: string | null;
  city?: string | null;
  state?: string | null;
  is_primary?: boolean | null;
};

export type MarketplacePublicTrainerRow = {
  trainer_profile_id: string;
  public_slug: string;
  display_name: string;
  professional_title: string | null;
  bio: string | null;
  years_experience: number | null;
  location_city: string | null;
  location_state: string | null;
  primary_specialty: string | null;
  secondary_specialties: string[] | null;
  coaching_style: string | null;
  modality: string | null;
  online_coaching_best_for: string | null;
  online_check_in_style: string | null;
  online_communication_cadence: string | null;
  online_expected_response_time: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  total_completed_packages: number | null;
  accepting_clients: boolean | null;
  is_featured: boolean | null;
  profile_photo_url: string | null;
  delivery_modes: string[] | null;
  goal_tags: string[] | null;
  experience_tags: string[] | null;
  price_min_cents: number | null;
  price_max_cents: number | null;
  available_locations: unknown;
  availability_summary: unknown;
  service_categories: unknown;
  certifications: unknown;
  locations: unknown;
  is_insured_trainer: boolean | null;
  insured_verified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  client_acceptance_status: string | null;
  typical_availability: string[] | null;
  availability_details: string | null;
  website_url: string | null;
  social_links: unknown;
  pricing_basis: string | null;
  contact_for_pricing: boolean | null;
  service_offerings: unknown;
  languages: string[] | null;
  marketplace_specialties: string[] | null;
  public_headline: string | null;
  best_fit_summary: string | null;
  marketplace_goal_tags: string[] | null;
  experience_levels_served: string[] | null;
  service_boundaries: string | null;
  consultation_expectations: string | null;
  availability_confirmed_at: string | null;
  decision_ready_service_offerings: unknown;
};

export type MarketplaceInternationalTrainerRow = {
  trainer_profile_id: string;
  country_code: string | null;
  location_city: string | null;
  location_region: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  service_radius_meters: number | null;
  currency_code: string | null;
};

export type MarketplaceTrustCredentialJson = {
  id: string;
  name: string | null;
  type: string | null;
  issuer: string | null;
  country_code: string | null;
  jurisdiction: string | null;
  verified_at?: string | null;
  expiration_date: string | null;
  public_status?: string | null;
};

export type MarketplacePublicTrustRow = {
  trainer_profile_id: string;
  profile_reviewed: boolean | null;
  profile_reviewed_at: string | null;
  email_verified: boolean | null;
  phone_verified: boolean | null;
  identity_verified: boolean | null;
  identity_verified_at: string | null;
  verified_credentials: unknown;
  claimed_credentials: unknown;
  background_check_completed: boolean | null;
  background_check_completed_at: string | null;
  background_check_product: string | null;
  insurance_confirmed: boolean | null;
  insurance_confirmed_through: string | null;
  profile_information_confirmed_at: string | null;
  account_in_good_standing: boolean | null;
};

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" ? value : value == null ? null : Number(value);
}

function normalizeCurrency(value: unknown) {
  const amount = normalizeNumber(value);
  return amount == null || Number.isNaN(amount) ? null : Math.round(amount) / 100;
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function parseObjectArray<T>(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as T[];
  }

  return value.filter((entry) => entry && typeof entry === "object") as T[];
}

function parseStringObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [key, normalizeText(entry)] as const)
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean) as string[])];
}

function buildSeedCategoryRecord(
  category: (typeof MARKETPLACE_CATEGORY_SEEDS)[number],
  overrides: Partial<ProfessionalCategoryRecord> = {},
): ProfessionalCategoryRecord {
  return {
    id: category.stableId,
    stableId: category.stableId,
    slug: category.publicSlug,
    publicSlug: category.publicSlug,
    label: category.label,
    headline: category.headline,
    shortDescription: category.shortDescription,
    sortOrder: category.sortOrder,
    isActive: true,
    ...overrides,
  };
}

function dedupeProfessionalCategories(categories: ProfessionalCategoryRecord[]) {
  const deduped = new Map<string, ProfessionalCategoryRecord>();

  categories.forEach((category) => {
    const dedupeKey = category.stableId || category.slug;
    const current = deduped.get(dedupeKey);

    if (!current || (!current.isPrimary && category.isPrimary)) {
      deduped.set(dedupeKey, category);
    }
  });

  return [...deduped.values()];
}

function buildServiceArea(
  availableLocationsValue: unknown,
  locationsValue: unknown,
) {
  const availableLocations = parseObjectArray<MarketplaceLocationJson>(availableLocationsValue);
  const firstAvailableLocation =
    availableLocations.find((entry) => entry.is_primary) ?? availableLocations[0] ?? null;

  if (firstAvailableLocation) {
    const fallbackLocation =
      uniqueStrings([firstAvailableLocation.city, firstAvailableLocation.state]).join(", ") || null;

    return normalizeText(firstAvailableLocation.location_name) ?? fallbackLocation;
  }

  const locations = parseObjectArray<MarketplaceLocationJson>(locationsValue);
  const firstLocation = locations.find((entry) => entry.is_primary) ?? locations[0] ?? null;

  if (!firstLocation) {
    return null;
  }

  const fallbackLocation = uniqueStrings([firstLocation.city, firstLocation.state]).join(", ") || null;

  return normalizeText(firstLocation.location_name) ?? fallbackLocation;
}

function mapTrustCredentialRows(
  trainerProfileId: string,
  verifiedRows: MarketplaceTrustCredentialJson[],
  claimedRows: MarketplaceTrustCredentialJson[],
): ProfessionalCredentialRecord[] {
  return [...verifiedRows, ...claimedRows].map((row, index) => ({
    id: `credential-${index}`,
    professionalProfileId: trainerProfileId,
    organizationName: normalizeText(row.issuer) ?? "Credentialing organization",
    credentialName: normalizeText(row.name) ?? "Credential",
    credentialType: normalizeText(row.type),
    issueDate: null,
    expirationDate: normalizeText(row.expiration_date),
    verificationStatus: row.verified_at ? "verified" : normalizeText(row.public_status) ?? "unverified",
    countryCode: normalizeText(row.country_code),
    jurisdiction: normalizeText(row.jurisdiction),
  }));
}

function mapServiceRecords(
  trainerProfileId: string,
  categories: ProfessionalCategoryRecord[],
): ProfessionalServiceRecord[] {
  return categories.map((category, index) => ({
    id: `${trainerProfileId}-${category.stableId}`,
    professionalProfileId: trainerProfileId,
    name: category.label,
    description: category.shortDescription ?? category.headline,
    serviceMode: null,
    durationMinutes: null,
    price: null,
    priceTo: null,
    pricingBasis: null,
    contactForPricing: false,
    sortOrder: index,
    isActive: true,
    currencyCode: "USD",
    intendedFor: null,
    includedItems: [],
    deliveryCadence: null,
    minimumCommitment: null,
    consultationType: "unspecified",
    additionalCostsNote: null,
  }));
}

function mapServiceOfferingRows(
  trainerProfileId: string,
  rows: MarketplaceServiceJson[],
): ProfessionalServiceRecord[] {
  return rows
    .filter((row) => row.is_active !== false)
    .map((row, index) => ({
      id: row.id,
      professionalProfileId: trainerProfileId,
      name: normalizeText(row.name) ?? "Service",
      description: normalizeText(row.description),
      serviceMode: normalizeText(row.service_mode),
      durationMinutes: normalizeNumber(row.duration_minutes),
      price: normalizeCurrency(row.price_min_cents),
      priceTo: normalizeCurrency(row.price_max_cents),
      pricingBasis: normalizeText(row.pricing_basis),
      contactForPricing: Boolean(row.contact_for_pricing),
      sortOrder: normalizeNumber(row.sort_order) ?? index,
      isActive: true,
      currencyCode: normalizeCurrencyCode(row.currency_code),
      intendedFor: normalizeText(row.intended_for),
      includedItems: parseStringArray(row.included_items),
      deliveryCadence: normalizeText(row.delivery_cadence),
      minimumCommitment: normalizeText(row.minimum_commitment),
      consultationType: normalizeText(row.consultation_type) ?? "unspecified",
      additionalCostsNote: normalizeText(row.additional_costs_note),
    }));
}

export function mapPublicMarketplaceRows(
  categoryRows: MarketplaceCategoryRow[],
  trainerRows: MarketplacePublicTrainerRow[],
  internationalRows: MarketplaceInternationalTrainerRow[],
  trustRows: MarketplacePublicTrustRow[],
): MarketplaceSnapshot {
  const internationalByProfileId = new Map(
    internationalRows.map((row) => [row.trainer_profile_id, row]),
  );
  const trustByProfileId = new Map(
    trustRows.map((row) => [row.trainer_profile_id, row]),
  );

  const categoryMap = new Map(
    MARKETPLACE_CATEGORY_SEEDS.map((category) => buildSeedCategoryRecord(category)).map((category) => [category.stableId, category]),
  );

  categoryRows.forEach((row) => {
    const stableId = normalizeText(row.slug);
    const routeSlug = normalizeText(row.public_slug) ?? stableId;
    const taxonomyCategory = resolveMarketplaceCategoryTaxonomy(stableId, routeSlug);

    if (!stableId || !routeSlug || !taxonomyCategory) {
      return;
    }

    categoryMap.set(taxonomyCategory.stableId, {
      id: row.id,
      stableId: taxonomyCategory.stableId,
      slug: taxonomyCategory.publicSlug,
      publicSlug: taxonomyCategory.publicSlug,
      label: taxonomyCategory.label,
      headline: taxonomyCategory.headline,
      shortDescription: taxonomyCategory.shortDescription ?? normalizeText(row.short_description),
      sortOrder: taxonomyCategory.sortOrder ?? normalizeNumber(row.sort_order) ?? 0,
      isActive: true,
    });
  });

  const categories = [...categoryMap.values()].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label),
  );

  const categoriesByStableId = new Map(categories.map((category) => [category.stableId, category]));

  const professionals = trainerRows.map((row) => {
    const international = internationalByProfileId.get(row.trainer_profile_id) ?? null;
    const trust = trustByProfileId.get(row.trainer_profile_id) ?? null;
    const categoryRowsForProfile = parseObjectArray<MarketplaceCategoryJson>(row.service_categories);
    const impliedServiceModes = new Set<string>();
    const impliedSpecialties = new Set<string>();
    const professionalCategories = dedupeProfessionalCategories(
      categoryRowsForProfile
        .map((categoryRow): ProfessionalCategoryRecord | null => {
          const routeSlug = normalizeText(categoryRow.public_slug) ?? normalizeText(categoryRow.slug);
          const stableId = normalizeText(categoryRow.stable_slug) ?? normalizeText(categoryRow.slug);
          const taxonomyCategory = resolveMarketplaceCategoryTaxonomy(stableId, routeSlug);
          const legacyMapping = getMarketplaceLegacyCategoryMapping(stableId)
            ?? getMarketplaceLegacyCategoryMapping(routeSlug);

          if (legacyMapping?.impliedServiceModes) {
            legacyMapping.impliedServiceModes.forEach((serviceMode) => impliedServiceModes.add(serviceMode));
          }

          if (legacyMapping?.impliedSpecialties) {
            legacyMapping.impliedSpecialties.forEach((specialty) => impliedSpecialties.add(specialty));
          }

          if (!routeSlug && !stableId && !taxonomyCategory) {
            return null;
          }

          const resolvedCategory =
            (taxonomyCategory ? categoriesByStableId.get(taxonomyCategory.stableId) : null)
            ?? {
              id: normalizeText(categoryRow.id) ?? taxonomyCategory?.stableId ?? stableId ?? routeSlug ?? "category",
              stableId: taxonomyCategory?.stableId ?? stableId ?? routeSlug ?? "category",
              slug: taxonomyCategory?.publicSlug ?? routeSlug ?? stableId ?? "category",
              publicSlug: taxonomyCategory?.publicSlug ?? routeSlug ?? stableId ?? "category",
              label: taxonomyCategory?.label ?? normalizeText(categoryRow.label) ?? "Category",
              headline:
                taxonomyCategory?.headline
                ?? normalizeText(categoryRow.headline)
                ?? normalizeText(categoryRow.label)
                ?? "Category",
              shortDescription: taxonomyCategory?.shortDescription ?? normalizeText(categoryRow.short_description),
              sortOrder: categoryRow.is_primary ? 0 : 999,
              isActive: true,
            };

          return {
            ...resolvedCategory,
            id: resolvedCategory.stableId,
            isPrimary: Boolean(categoryRow.is_primary),
          };
        })
        .filter((category): category is ProfessionalCategoryRecord => Boolean(category)),
    ).sort((left, right) => {
      const primaryDifference = Number(Boolean(right.isPrimary)) - Number(Boolean(left.isPrimary));

      if (primaryDifference !== 0) {
        return primaryDifference;
      }

      return left.sortOrder - right.sortOrder || left.label.localeCompare(right.label);
    });

    const specialties = uniqueStrings([
      ...parseStringArray(row.marketplace_specialties),
      humanizeMarketplaceValue(row.primary_specialty),
      ...parseStringArray(row.secondary_specialties).map((entry) => humanizeMarketplaceValue(entry)),
      ...[...impliedSpecialties],
    ]);
    const serviceModes = uniqueStrings([
      ...parseStringArray(row.delivery_modes),
      ...[...impliedServiceModes],
    ]);
    const hasDecisionReadyServices = row.decision_ready_service_offerings !== null
      && row.decision_ready_service_offerings !== undefined;
    const decisionReadyServiceRows = parseObjectArray<MarketplaceServiceJson>(row.decision_ready_service_offerings);
    const serviceOfferingRows = hasDecisionReadyServices
      ? decisionReadyServiceRows
      : parseObjectArray<MarketplaceServiceJson>(row.service_offerings);
    const services = serviceOfferingRows.length > 0
      ? mapServiceOfferingRows(row.trainer_profile_id, serviceOfferingRows)
      : hasDecisionReadyServices
        ? []
        : mapServiceRecords(row.trainer_profile_id, professionalCategories);
    const servicePrices = services
      .map((service) => service.price)
      .filter((price): price is number => price != null);
    const servicePriceMaximums = services
      .map((service) => service.priceTo ?? service.price)
      .filter((price): price is number => price != null);
    const servicePricingBases = uniqueStrings(services.map((service) => service.pricingBasis));
    const profilePriceFrom = normalizeCurrency(row.price_min_cents);
    const profilePriceTo = normalizeCurrency(row.price_max_cents);
    const countryCode = normalizeCountryCode(international?.country_code, "");
    const pricingCurrency = normalizeCurrencyCode(
      international?.currency_code,
      getDefaultCurrencyCode(countryCode),
    );
    const localizedServices = services.map((service) => ({ ...service, currencyCode: pricingCurrency }));
    const verifiedTrustCredentials = parseObjectArray<MarketplaceTrustCredentialJson>(trust?.verified_credentials);
    const claimedTrustCredentials = parseObjectArray<MarketplaceTrustCredentialJson>(trust?.claimed_credentials);
    const credentials = mapTrustCredentialRows(row.trainer_profile_id, verifiedTrustCredentials, claimedTrustCredentials);

    return {
      id: row.trainer_profile_id,
      displayName: row.display_name,
      profileSlug: row.public_slug,
      profilePhotoUrl: normalizeText(row.profile_photo_url),
      professionalTitle:
        normalizeText(row.professional_title)
        ?? humanizeMarketplaceValue(row.primary_specialty)
        ?? "Coach",
      bio: normalizeText(row.bio) ?? "",
      yearsExperience: normalizeNumber(row.years_experience),
      publicHeadline: normalizeText(row.public_headline),
      bestFitSummary: normalizeText(row.best_fit_summary),
      specialties,
      goalTags: uniqueStrings([
        ...parseStringArray(row.marketplace_goal_tags),
        ...parseStringArray(row.goal_tags),
      ]),
      experienceLevelsServed: uniqueStrings([
        ...parseStringArray(row.experience_levels_served),
        ...parseStringArray(row.experience_tags),
      ]),
      coachingStyle: normalizeText(row.coaching_style),
      serviceBoundaries: normalizeText(row.service_boundaries),
      consultationExpectations: normalizeText(row.consultation_expectations),
      languages: parseStringArray(row.languages),
      countryCode,
      city: normalizeText(international?.location_city) ?? normalizeText(row.location_city),
      state: normalizeText(international?.location_region) ?? normalizeText(row.location_state),
      postalCode: null,
      serviceRadiusMeters: normalizeNumber(international?.service_radius_meters),
      serviceArea: buildServiceArea(row.available_locations, row.locations),
      remoteAvailable: serviceModes.includes("online") || serviceModes.includes("hybrid"),
      serviceModes,
      priceFrom: profilePriceFrom ?? (servicePrices.length > 0 ? Math.min(...servicePrices) : null),
      priceTo: profilePriceTo ?? (servicePriceMaximums.length > 0 ? Math.max(...servicePriceMaximums) : null),
      pricingCurrency,
      pricingBasis: normalizeText(row.pricing_basis) ?? (servicePricingBases.length === 1 ? servicePricingBases[0] : null),
      contactForPricing: Boolean(row.contact_for_pricing)
        || (profilePriceFrom == null && servicePrices.length === 0 && services.some((service) => service.contactForPricing)),
      availabilitySummary: buildAvailabilitySummaryText(row.availability_summary),
      typicalAvailability: parseStringArray(row.typical_availability),
      availabilityDetails: normalizeText(row.availability_details),
      availabilityConfirmedAt: normalizeText(row.availability_confirmed_at),
      clientAcceptanceStatus: normalizeText(row.client_acceptance_status) ?? "accepting",
      websiteUrl: normalizeText(row.website_url),
      socialLinks: parseStringObject(row.social_links),
      approvalStatus: "approved",
      isActive: true,
      isPublic: true,
      trustSummary: {
        profileReviewed: trust?.profile_reviewed ?? true,
        profileReviewedAt: normalizeText(trust?.profile_reviewed_at),
        emailVerified: trust?.email_verified ?? false,
        phoneVerified: trust?.phone_verified ?? false,
        identityVerified: trust?.identity_verified ?? false,
        identityVerifiedAt: normalizeText(trust?.identity_verified_at),
        backgroundCheckCompleted: trust?.background_check_completed ?? false,
        backgroundCheckCompletedAt: normalizeText(trust?.background_check_completed_at),
        backgroundCheckProduct: null,
        insuranceConfirmed: trust?.insurance_confirmed ?? false,
        insuranceConfirmedThrough: normalizeText(trust?.insurance_confirmed_through),
        profileInformationConfirmedAt: normalizeText(trust?.profile_information_confirmed_at),
        accountInGoodStanding: trust?.account_in_good_standing ?? true,
      },
      categories: professionalCategories,
      credentials,
      services: localizedServices,
      createdAt: normalizeText(row.created_at),
      updatedAt: normalizeText(row.updated_at),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    categories,
    professionals,
  };
}
