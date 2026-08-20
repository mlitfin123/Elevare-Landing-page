import fs from "node:fs/promises";
import path from "node:path";
import { buildAvailabilitySummaryText, humanizeMarketplaceValue } from "../lib/marketplace-account.ts";
import { MARKETPLACE_CATEGORY_SEEDS } from "../lib/marketplace-categories.ts";
import {
  getMarketplaceLegacyCategoryMapping,
  resolveMarketplaceCategoryTaxonomy,
} from "../lib/marketplace-taxonomy.ts";
import {
  EMPTY_MARKETPLACE_SNAPSHOT,
  type MarketplaceSnapshot,
  type ProfessionalCategoryRecord,
  type ProfessionalCredentialRecord,
  type ProfessionalProfileRecord,
  type ProfessionalServiceRecord,
} from "../lib/marketplace-types.ts";
import {
  getDefaultCurrencyCode,
  normalizeCountryCode,
  normalizeCurrencyCode,
} from "../lib/marketplace-location.ts";

const supabaseUrl = process.env.SECOND_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SECOND_SUPABASE_URL ?? null;
const serviceRoleKey = process.env.SECOND_SUPABASE_SERVICE_ROLE_KEY ?? null;
const pageSize = 1000;
const generatedDir = path.join(process.cwd(), ".generated");
const generatedDataPath = path.join(generatedDir, "marketplace-data.json");
const publicDir = path.join(process.cwd(), "public");
const publicDataPath = path.join(publicDir, "marketplace-data.json");

type MarketplaceCategoryRow = {
  id: string;
  slug: string;
  public_slug: string | null;
  label: string;
  headline: string;
  short_description: string | null;
  sort_order: number | null;
  internal_description: string | null;
};

type MarketplaceCategoryJson = {
  id: string | null;
  slug: string | null;
  stable_slug?: string | null;
  public_slug?: string | null;
  label: string | null;
  headline: string | null;
  short_description: string | null;
  is_primary?: boolean | null;
};

type MarketplaceCredentialJson = {
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

type MarketplaceServiceJson = {
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
};

type MarketplaceLocationJson = {
  location_name?: string | null;
  city?: string | null;
  state?: string | null;
  is_primary?: boolean | null;
};

type MarketplacePublicTrainerRow = {
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
};

type MarketplaceInternationalTrainerRow = {
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

function normalizeSnapshotCategory(
  category: Partial<ProfessionalCategoryRecord> | null | undefined,
  isPrimaryFallback = false,
) {
  const stableId = normalizeText(category?.stableId) ?? normalizeText(category?.id);
  const publicSlug = normalizeText(category?.publicSlug) ?? normalizeText(category?.slug);
  const taxonomyCategory = resolveMarketplaceCategoryTaxonomy(stableId, publicSlug);
  const legacyMapping = getMarketplaceLegacyCategoryMapping(stableId)
    ?? getMarketplaceLegacyCategoryMapping(publicSlug);

  if (!taxonomyCategory && !legacyMapping) {
    return {
      category: null,
      impliedServiceModes: [] as string[],
      impliedSpecialties: [] as string[],
    };
  }

  const resolvedStableId = taxonomyCategory?.stableId ?? legacyMapping?.nextStableId ?? null;
  const seedCategory = MARKETPLACE_CATEGORY_SEEDS.find((entry) => entry.stableId === resolvedStableId);

  return {
    category: seedCategory
      ? buildSeedCategoryRecord(seedCategory, {
          isPrimary: Boolean(category?.isPrimary) || isPrimaryFallback,
        })
      : null,
    impliedServiceModes: legacyMapping?.impliedServiceModes ?? [],
    impliedSpecialties: legacyMapping?.impliedSpecialties ?? [],
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

function normalizeProfessionalSnapshotRecord(professional: ProfessionalProfileRecord): ProfessionalProfileRecord {
  const { userId: _legacyUserId, ...publicProfessional } = professional as ProfessionalProfileRecord & {
    userId?: string;
  };
  void _legacyUserId;
  const impliedServiceModes = new Set<string>();
  const impliedSpecialties = new Set<string>();
  const normalizedCategories = dedupeProfessionalCategories(
    (professional.categories ?? [])
      .map((category, index) => {
        const normalized = normalizeSnapshotCategory(category, index === 0);
        normalized.impliedServiceModes.forEach((entry) => impliedServiceModes.add(entry));
        normalized.impliedSpecialties.forEach((entry) => impliedSpecialties.add(entry));
        return normalized.category;
      })
      .filter((category): category is ProfessionalCategoryRecord => Boolean(category))
      .sort((left, right) => {
        const primaryDifference = Number(Boolean(right.isPrimary)) - Number(Boolean(left.isPrimary));

        if (primaryDifference !== 0) {
          return primaryDifference;
        }

        return left.sortOrder - right.sortOrder || left.label.localeCompare(right.label);
      }),
  );
  const countryCode = normalizeCountryCode(professional.countryCode, "");
  const pricingCurrency = normalizeCurrencyCode(
    professional.pricingCurrency,
    getDefaultCurrencyCode(countryCode),
  );

  return {
    ...publicProfessional,
    isPublic:
      professional.isPublic
      ?? (professional.approvalStatus === "approved" && professional.isActive),
    specialties: uniqueStrings([
      ...(professional.specialties ?? []),
      ...[...impliedSpecialties],
    ]),
    serviceModes: uniqueStrings([
      ...(professional.serviceModes ?? []),
      ...[...impliedServiceModes],
    ]),
    remoteAvailable:
      professional.remoteAvailable
      || professional.serviceModes.includes("online")
      || professional.serviceModes.includes("hybrid")
      || impliedServiceModes.has("online")
      || impliedServiceModes.has("hybrid"),
    categories: normalizedCategories,
    contactForPricing: professional.contactForPricing ?? false,
    typicalAvailability: professional.typicalAvailability ?? [],
    availabilityDetails: professional.availabilityDetails ?? null,
    clientAcceptanceStatus: professional.clientAcceptanceStatus ?? "accepting",
    websiteUrl: professional.websiteUrl ?? null,
    socialLinks: professional.socialLinks ?? {},
    countryCode,
    postalCode: professional.postalCode ?? null,
    serviceRadiusMeters: professional.serviceRadiusMeters ?? null,
    pricingCurrency,
    credentials: (professional.credentials ?? []).map((credential) => ({
      ...credential,
      countryCode: credential.countryCode ?? null,
      jurisdiction: credential.jurisdiction ?? null,
    })),
    services: professional.services?.length
      ? professional.services.map((service) => ({
          ...service,
          contactForPricing: service.contactForPricing ?? false,
          currencyCode: normalizeCurrencyCode(service.currencyCode, pricingCurrency),
        }))
      : mapServiceRecords(professional.id, normalizedCategories).map((service) => ({
          ...service,
          currencyCode: pricingCurrency,
        })),
  };
}

function normalizeExistingSnapshot(snapshot: MarketplaceSnapshot | null) {
  if (!snapshot) {
    return null;
  }

  return {
    generatedAt: snapshot.generatedAt ?? null,
    categories: MARKETPLACE_CATEGORY_SEEDS.map((category) => buildSeedCategoryRecord(category)),
    professionals: (snapshot.professionals ?? []).map((professional) =>
      normalizeProfessionalSnapshotRecord(professional),
    ),
  } satisfies MarketplaceSnapshot;
}

async function writeSnapshot(snapshot: MarketplaceSnapshot) {
  await fs.mkdir(generatedDir, { recursive: true });
  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(generatedDataPath, JSON.stringify(snapshot, null, 2));
  await fs.writeFile(publicDataPath, JSON.stringify(snapshot, null, 2));
}

async function readExistingSnapshot() {
  try {
    return JSON.parse(await fs.readFile(generatedDataPath, "utf8")) as MarketplaceSnapshot;
  } catch {
    return null;
  }
}

function buildFallbackSnapshot(existingSnapshot: MarketplaceSnapshot | null = null): MarketplaceSnapshot {
  const normalizedSnapshot = normalizeExistingSnapshot(existingSnapshot);

  return {
    ...EMPTY_MARKETPLACE_SNAPSHOT,
    generatedAt: normalizedSnapshot?.generatedAt ?? new Date().toISOString(),
    categories: MARKETPLACE_CATEGORY_SEEDS.map((category) => buildSeedCategoryRecord(category)),
    professionals: normalizedSnapshot?.professionals ?? [],
  };
}

async function fetchAllPages<T>(
  table: string,
  select: string,
  filters: Record<string, string> = {},
  order = "created_at.asc",
) {
  if (!supabaseUrl || !serviceRoleKey) {
    return [] as T[];
  }

  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      select,
      order,
      limit: String(pageSize),
      offset: String(offset),
      ...filters,
    });

    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${params.toString()}`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${table}: ${response.status} ${response.statusText}`);
    }

    const batch = (await response.json()) as T[];

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
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

function mapCredentialRows(
  trainerProfileId: string,
  rows: MarketplaceCredentialJson[],
): ProfessionalCredentialRecord[] {
  return rows.map((row) => ({
    id: row.id,
    professionalProfileId: trainerProfileId,
    organizationName: normalizeText(row.issuing_body) ?? "Credentialing organization",
    credentialName: normalizeText(row.credential_name) ?? "Credential",
    credentialType: normalizeText(row.credential_type),
    issueDate: normalizeText(row.issue_date),
    expirationDate: normalizeText(row.expiration_date),
    verificationStatus: normalizeText(row.verification_status) ?? "unverified",
    countryCode: normalizeText(row.credential_country_code),
    jurisdiction: normalizeText(row.credential_jurisdiction),
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
    }));
}

async function buildSnapshot(): Promise<MarketplaceSnapshot> {
  const existingSnapshot = await readExistingSnapshot();
  const fallback = buildFallbackSnapshot(existingSnapshot);

  if (!supabaseUrl || !serviceRoleKey) {
    return fallback;
  }

  const [categoryRows, trainerRows, internationalRows] = await Promise.all([
    fetchAllPages<MarketplaceCategoryRow>(
      "marketplace_service_categories_v1",
      "*",
      {},
      "sort_order.asc,label.asc",
    ),
    fetchAllPages<MarketplacePublicTrainerRow>(
      "marketplace_public_trainer_profiles_v2",
      "*",
      {},
      "updated_at.desc,display_name.asc",
    ),
    fetchAllPages<MarketplaceInternationalTrainerRow>(
      "marketplace_public_trainer_international_v1",
      "*",
      {},
      "trainer_profile_id.asc",
    ),
  ]);
  const internationalByProfileId = new Map(
    internationalRows.map((row) => [row.trainer_profile_id, row]),
  );

  const categoryMap = new Map(
    fallback.categories.map((category) => [category.stableId, category]),
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
      ...parseStringArray(row.goal_tags),
      humanizeMarketplaceValue(row.primary_specialty),
      ...parseStringArray(row.secondary_specialties).map((entry) => humanizeMarketplaceValue(entry)),
      ...[...impliedSpecialties],
    ]);
    const serviceModes = uniqueStrings([
      ...parseStringArray(row.delivery_modes),
      ...[...impliedServiceModes],
    ]);
    const serviceOfferingRows = parseObjectArray<MarketplaceServiceJson>(row.service_offerings);
    const services = serviceOfferingRows.length > 0
      ? mapServiceOfferingRows(row.trainer_profile_id, serviceOfferingRows)
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
      specialties,
      countryCode,
      city: normalizeText(international?.location_city) ?? normalizeText(row.location_city),
      state: normalizeText(international?.location_region) ?? normalizeText(row.location_state),
      postalCode: normalizeText(international?.postal_code),
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
      clientAcceptanceStatus: normalizeText(row.client_acceptance_status) ?? "accepting",
      websiteUrl: normalizeText(row.website_url),
      socialLinks: parseStringObject(row.social_links),
      approvalStatus: "approved",
      isActive: true,
      isPublic: true,
      identityVerificationStatus: "verified",
      reviewFeedbackPublic: null,
      lastSubmittedAt: null,
      categories: professionalCategories,
      credentials: mapCredentialRows(
        row.trainer_profile_id,
        parseObjectArray<MarketplaceCredentialJson>(row.certifications),
      ),
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

async function main() {
  try {
    const snapshot = await buildSnapshot();
    await writeSnapshot(snapshot);
    console.log(
      `Generated marketplace data for ${snapshot.professionals.length} public professionals across ${snapshot.categories.length} categories.`,
    );
  } catch (error) {
    const fallback = buildFallbackSnapshot(await readExistingSnapshot());
    await writeSnapshot(fallback);
    console.warn("Fell back to the previous marketplace snapshot because the live marketplace data could not be loaded.");
    console.warn(error instanceof Error ? error.message : error);
  }
}

await main();
