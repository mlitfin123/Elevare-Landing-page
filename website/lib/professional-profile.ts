export const US_STATE_OPTIONS = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
  ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ["AS", "American Samoa"], ["GU", "Guam"], ["MP", "Northern Mariana Islands"],
  ["PR", "Puerto Rico"], ["VI", "U.S. Virgin Islands"],
] as const;

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

export type ProfileCompletenessInput = {
  name: string;
  professionalTitle: string;
  profilePhotoUrl: string;
  bio: string;
  primaryCategory: string;
  specialties: string[];
  serviceModes: string[];
  city: string;
  state: string;
  services: Array<{ name: string }>;
  hasPricing: boolean;
  availability: string[];
  acceptanceStatus: string;
};

export function normalizeStateValue(value: string | null | undefined) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) return "";

  const matchingState = US_STATE_OPTIONS.find(
    ([abbreviation, name]) =>
      abbreviation.toLowerCase() === normalizedValue.toLowerCase()
      || name.toLowerCase() === normalizedValue.toLowerCase(),
  );

  return matchingState?.[0] ?? normalizedValue;
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
  const checks = [
    { label: "Add your name", complete: Boolean(input.name.trim()) },
    { label: "Add a professional title", complete: Boolean(input.professionalTitle.trim()) },
    { label: "Add a profile photo", complete: Boolean(input.profilePhotoUrl.trim()) },
    { label: "Write your bio", complete: Boolean(input.bio.trim()) },
    { label: "Choose a primary category", complete: Boolean(input.primaryCategory) },
    { label: "Choose at least one specialty", complete: input.specialties.length > 0 },
    { label: "Choose how you work", complete: input.serviceModes.length > 0 },
    {
      label: "Add your service location or choose online",
      complete: input.serviceModes.includes("online") || input.serviceModes.includes("hybrid")
        || Boolean(input.city.trim() && input.state.trim()),
    },
    { label: "Add at least one service", complete: input.services.some((service) => service.name.trim()) },
    { label: "Add pricing or choose contact for pricing", complete: input.hasPricing },
    { label: "Add typical availability", complete: input.availability.length > 0 },
    { label: "Set your new-client status", complete: Boolean(input.acceptanceStatus) },
  ];

  const completed = checks.filter((check) => check.complete).length;
  return {
    percent: Math.round((completed / checks.length) * 100),
    missing: checks.filter((check) => !check.complete).map((check) => check.label),
  };
}
