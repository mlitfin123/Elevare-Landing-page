import {
  normalizeCurrencyCode,
  normalizeRegionValue,
  isRegionRequired,
} from "./marketplace-location.ts";

export { US_STATE_OPTIONS } from "./marketplace-location.ts";

export const SERVICE_MODE_OPTIONS = [
  { value: "in_person", label: "In person" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: "mornings", label: "Mornings" },
  { value: "afternoons", label: "Afternoons" },
  { value: "evenings", label: "Evenings" },
  { value: "weekends", label: "Weekends" },
] as const;

export const PRICING_BASIS_OPTIONS = [
  { value: "session", label: "Per session" },
  { value: "hour", label: "Per hour" },
  { value: "class", label: "Per class" },
  { value: "consultation", label: "Per consultation" },
  { value: "week", label: "Per week" },
  { value: "month", label: "Per month" },
  { value: "package", label: "Per package" },
] as const;

export const ACCEPTANCE_OPTIONS = [
  { value: "accepting", label: "Yes" },
  { value: "waitlist", label: "Waitlist" },
  { value: "not_accepting", label: "No" },
] as const;

export const PROFESSIONAL_LANGUAGE_SUGGESTIONS = [
  "English",
  "Spanish",
  "French",
  "Portuguese",
  "Haitian Creole",
  "Mandarin",
  "Cantonese",
  "Arabic",
  "Hindi",
  "Other",
] as const;

export type ProfessionalSectionId = "about" | "offer" | "work" | "pricing" | "credentials" | "links";

export type ProfileCompletenessItem = {
  id: string;
  label: string;
  section: ProfessionalSectionId;
  complete: boolean;
};

export type ProfileCompletenessInput = {
  name: string;
  professionalTitle: string;
  profilePhotoUrl: string;
  bio: string;
  primaryCategory: string;
  specialties: string[];
  serviceModes: string[];
  countryCode: string;
  city: string;
  state: string;
  services: Array<{ name: string }>;
  availability: string[];
  acceptanceStatus: string;
};

type CategoryWithSpecialties = {
  specialties: readonly string[];
};

type ServicePricingInput = {
  priceFrom: string;
  priceTo: string;
  pricingBasis: string;
  contactForPricing: boolean;
  currencyCode?: string;
};

export function collectCategorySpecialties(categories: readonly CategoryWithSpecialties[]) {
  return [...new Set(categories.flatMap((category) => category.specialties))];
}

export function retainAvailableSpecialties(
  selectedSpecialties: readonly string[],
  categories: readonly CategoryWithSpecialties[],
) {
  const available = new Set(collectCategorySpecialties(categories));
  return selectedSpecialties.filter((specialty) => available.has(specialty));
}

export function hasServiceLevelPricing(services: readonly ServicePricingInput[]) {
  return services.some((service) => service.contactForPricing || Boolean(service.priceFrom.trim()));
}

export function formatServicePricingSummary(service: ServicePricingInput) {
  if (service.contactForPricing) return "Contact for pricing";
  if (!service.priceFrom.trim()) return "Pricing not listed";

  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: normalizeCurrencyCode(service.currencyCode),
    maximumFractionDigits: 0,
  });
  const basis = service.pricingBasis ? `/${service.pricingBasis}` : "";
  if (service.priceTo.trim() && Number(service.priceTo) > Number(service.priceFrom)) {
    return `${formatter.format(Number(service.priceFrom))}-${formatter.format(Number(service.priceTo))}${basis}`;
  }
  return `${formatter.format(Number(service.priceFrom))}${basis}`;
}

export function formatCredentialVerificationStatus(
  value: string | null | undefined,
  expirationDate?: string,
  today = new Date(),
) {
  if (expirationDate) {
    const expiration = new Date(`${expirationDate}T23:59:59`);
    if (!Number.isNaN(expiration.getTime()) && expiration < today) return "Expired";
  }

  const normalized = value?.trim().toLowerCase();
  if (normalized === "verified" || normalized === "approved") return "Verified";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "pending" || normalized === "pending_review") return "Pending Verification";
  return "Unverified";
}

export function normalizeStateValue(value: string | null | undefined) {
  return normalizeRegionValue("US", value);
}

export function isValidOptionalUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export function deriveLegacySpecialties(primaryCategory: string, specialties: string[]) {
  const normalizedSpecialties = specialties.map((entry) => entry.toLowerCase());
  let primary = "general_fitness";

  if (primaryCategory === "strength_conditioning" || primaryCategory === "strength_sports") {
    primary = "strength_training";
  } else if (primaryCategory === "bodybuilding_physique") {
    primary = normalizedSpecialties.some((entry) => entry.includes("prep") || entry.includes("compet"))
      ? "competition_prep"
      : "muscle_gain_body_recomposition";
  } else if (primaryCategory === "running_endurance" || primaryCategory === "sports_performance") {
    primary = "athletic_performance";
  } else if (primaryCategory === "yoga_pilates_mobility" || primaryCategory === "recovery_bodywork") {
    primary = "mobility_flexibility";
  } else if (primaryCategory === "special_populations") {
    primary = normalizedSpecialties.some((entry) => entry.includes("senior") || entry.includes("aging"))
      ? "senior_fitness"
      : "injury_aware_training";
  }

  const recognized = [
    "general_fitness", "strength_training", "competition_prep", "muscle_gain_body_recomposition",
    "athletic_performance", "mobility_flexibility", "senior_fitness", "injury_aware_training",
    "beginner_coaching", "fat_loss", "womens_fitness", "online_coaching",
  ];
  const secondary = normalizedSpecialties
    .map((entry) => entry.replaceAll(/[^a-z0-9]+/g, "_").replaceAll(/^_|_$/g, ""))
    .filter((entry) => recognized.includes(entry) && entry !== primary)
    .slice(0, 3);

  return { primary, secondary };
}

export function calculateProfileCompleteness(input: ProfileCompletenessInput) {
  const checks: ProfileCompletenessItem[] = [
    { id: "name", label: "Add your name", section: "about", complete: Boolean(input.name.trim()) },
    { id: "professionalTitle", label: "Add a professional title", section: "about", complete: Boolean(input.professionalTitle.trim()) },
    { id: "photo", label: "Add a profile photo", section: "about", complete: Boolean(input.profilePhotoUrl.trim()) },
    { id: "bio", label: "Write your bio", section: "about", complete: Boolean(input.bio.trim()) },
    { id: "primaryCategory", label: "Choose a primary category", section: "offer", complete: Boolean(input.primaryCategory) },
    { id: "specialties", label: "Choose at least one specialty", section: "offer", complete: input.specialties.length > 0 },
    { id: "serviceModes", label: "Choose how you work", section: "work", complete: input.serviceModes.length > 0 },
    {
      id: "location",
      label: "Add your service location or choose online",
      section: "work",
      complete: input.serviceModes.includes("in_person") || input.serviceModes.includes("hybrid")
        ? Boolean(input.city.trim() && (!isRegionRequired(input.countryCode) || input.state.trim()))
        : input.serviceModes.includes("online"),
    },
    { id: "services", label: "Add at least one service", section: "offer", complete: input.services.some((service) => service.name.trim()) },
    { id: "availability", label: "Add typical availability", section: "work", complete: input.availability.length > 0 },
    { id: "acceptance", label: "Set your new-client status", section: "work", complete: Boolean(input.acceptanceStatus) },
  ];

  const completed = checks.filter((check) => check.complete).length;
  return {
    percent: Math.round((completed / checks.length) * 100),
    missing: checks.filter((check) => !check.complete).map((check) => check.label),
    items: checks,
  };
}
