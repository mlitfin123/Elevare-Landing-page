import type {
  ProfessionalCategoryRecord,
  ProfessionalProfileRecord,
} from "./marketplace-types.ts";
import { getMarketplaceTaxonomyCategoryByPublicSlug } from "./marketplace-taxonomy.ts";
import {
  formatSeoLocation,
  getRegionDisplayName,
  normalizeCountryCode,
} from "./marketplace-location.ts";

export type MarketplaceResourceLink = {
  href: string;
  label: string;
  description: string;
};

const CATEGORY_SEO_LABELS: Record<string, string> = {
  "personal-training": "Personal Trainers",
  "strength-conditioning": "Strength and Conditioning Coaches",
  "bodybuilding-physique": "Bodybuilding and Physique Coaches",
  "strength-sports": "Strength Sports Coaches",
  "running-endurance": "Running and Endurance Coaches",
  "sports-performance": "Sports Performance Coaches",
  nutrition: "Nutrition Coaches",
  dietetics: "Dietitians",
  "health-wellness-coaching": "Health and Wellness Coaches",
  "life-mindset-coaching": "Life and Mindset Coaches",
  yoga: "Yoga Instructors",
  pilates: "Pilates Instructors",
  "mobility-movement": "Mobility and Movement Professionals",
  "mindfulness-breathwork": "Mindfulness and Breathwork Professionals",
  "recovery-bodywork": "Recovery and Bodywork Professionals",
  "special-population-fitness": "Special Population Fitness Professionals",
};

const CATEGORY_RESOURCE_LINKS: Record<string, MarketplaceResourceLink[]> = {
  "personal-training": [
    { href: "/workouts/", label: "Workout templates", description: "Explore structured plans before comparing trainers." },
    { href: "/exercises/", label: "Exercise guides", description: "Review movements, equipment, and training basics." },
    { href: "/calculators/", label: "Fitness calculators", description: "Estimate useful starting points for training and nutrition." },
  ],
  "strength-conditioning": [
    { href: "/workouts/strength/", label: "Strength workouts", description: "Browse strength-focused workout templates." },
    { href: "/calculators/one-rep-max-calculator/", label: "1RM calculator", description: "Estimate a one-rep max and training percentages." },
    { href: "/exercises/", label: "Exercise database", description: "Compare movements by muscle group and equipment." },
  ],
  "bodybuilding-physique": [
    { href: "/blog/category/prep-files/", label: "Prep Files", description: "Follow a documented physique competition prep." },
    { href: "/stagelab/", label: "StageLab", description: "Explore competition-prep tracking and review tools." },
    { href: "/calculators/contest-prep-countdown/", label: "Prep countdown", description: "Calculate weeks out and the current prep phase." },
  ],
  "strength-sports": [
    { href: "/calculators/one-rep-max-calculator/", label: "1RM calculator", description: "Estimate max strength from a working set." },
    { href: "/calculators/dots-calculator/", label: "DOTS calculator", description: "Compare powerlifting performance across bodyweights." },
    { href: "/workouts/strength/", label: "Strength workouts", description: "Explore strength-focused workout templates." },
  ],
  "running-endurance": [
    { href: "/calculators/pace-calculator/", label: "Pace calculator", description: "Convert distance and time into training pace." },
    { href: "/calculators/running-calorie-calculator/", label: "Running calorie calculator", description: "Estimate calories used during a run." },
    { href: "/calculators/target-heart-rate-calculator/", label: "Heart-rate zones", description: "Estimate age-based training zones." },
  ],
  nutrition: [
    { href: "/nutrition/", label: "Restaurant nutrition", description: "Compare calories and macros before ordering." },
    { href: "/calculators/macro-calculator/", label: "Macro calculator", description: "Estimate protein, fat, and carbohydrate targets." },
    { href: "/blog/category/nutrition/", label: "Nutrition articles", description: "Read practical nutrition and tracking guidance." },
  ],
  dietetics: [
    { href: "/nutrition/", label: "Nutrition resources", description: "Explore public restaurant nutrition data." },
    { href: "/calculators/protein-calculator/", label: "Protein calculator", description: "Estimate a practical daily protein range." },
    { href: "/blog/category/nutrition/", label: "Nutrition articles", description: "Read educational nutrition content." },
  ],
};

const DEFAULT_RESOURCE_LINKS: MarketplaceResourceLink[] = [
  { href: "/blog/", label: "Fitness insights", description: "Read practical articles on training, nutrition, and progress." },
  { href: "/calculators/", label: "Free calculators", description: "Use educational fitness and nutrition estimates." },
  { href: "/apps/", label: "ElevareFit apps", description: "Explore the products across the ElevareFit ecosystem." },
];

export function isPublicMarketplaceProfessional(professional: ProfessionalProfileRecord) {
  return professional.approvalStatus === "approved" && professional.isActive && professional.isPublic;
}

export function getIndexableMarketplaceProfessionals(professionals: ProfessionalProfileRecord[]) {
  return professionals.filter(isPublicMarketplaceProfessional);
}

export function isOnlineOnlyMarketplaceProfessional(professional: ProfessionalProfileRecord) {
  const modes = new Set(professional.serviceModes);
  const offersOnline = professional.remoteAvailable || modes.has("online");
  const offersLocal = modes.has("in_person") || modes.has("hybrid");

  return offersOnline && !offersLocal;
}

export function isMarketplaceFilteredSearch(value: string | URLSearchParams) {
  const params = typeof value === "string" ? new URLSearchParams(value) : value;
  return params.toString().length > 0;
}

export function getMarketplaceCategoryProfessionalCount(
  category: ProfessionalCategoryRecord,
  professionals: ProfessionalProfileRecord[],
) {
  return professionals.filter(
    (professional) =>
      isPublicMarketplaceProfessional(professional)
      && professional.categories.some(
        (entry) => entry.stableId === category.stableId || entry.slug === category.slug,
      ),
  ).length;
}

export function isMarketplaceCategoryIndexable(
  category: ProfessionalCategoryRecord,
  professionals: ProfessionalProfileRecord[],
) {
  return category.isActive && getMarketplaceCategoryProfessionalCount(category, professionals) > 0;
}

export function isSeoLocationPageEligible({
  category,
  professionals,
  countryCode,
  city,
  region,
  hasUniqueContent,
  hasMeaningfulSearchIntent,
  inventoryMeetsRequirement,
}: {
  category: ProfessionalCategoryRecord;
  professionals: ProfessionalProfileRecord[];
  countryCode?: string;
  city?: string;
  region?: string;
  hasUniqueContent: boolean;
  hasMeaningfulSearchIntent: boolean;
  inventoryMeetsRequirement?: (approvedPublicInventory: number) => boolean;
}) {
  if (
    !category.isActive
    || !hasUniqueContent
    || !hasMeaningfulSearchIntent
    || !inventoryMeetsRequirement
  ) {
    return false;
  }

  const normalizedCountry = normalizeCountryCode(countryCode, "");
  const normalizedCity = city?.trim().toLowerCase();
  const normalizedRegion = getRegionDisplayName(normalizedCountry, region).toLowerCase();

  const approvedPublicInventory = professionals.filter((professional) => {
    if (!isPublicMarketplaceProfessional(professional)) {
      return false;
    }

    const matchesCategory = professional.categories.some(
      (entry) => entry.stableId === category.stableId || entry.slug === category.slug,
    );
    const matchesCountry = !normalizedCountry
      || normalizeCountryCode(professional.countryCode, "") === normalizedCountry;
    const matchesCity = !normalizedCity
      || professional.city?.trim().toLowerCase() === normalizedCity;
    const matchesRegion = !normalizedRegion
      || getRegionDisplayName(professional.countryCode, professional.state).toLowerCase() === normalizedRegion;

    return matchesCategory && matchesCountry && matchesCity && matchesRegion;
  }).length;

  return inventoryMeetsRequirement(approvedPublicInventory);
}

export function getMarketplaceCategorySeoLabel(category: ProfessionalCategoryRecord) {
  return CATEGORY_SEO_LABELS[category.slug] ?? `${category.label} Professionals`;
}

export function buildMarketplaceCategoryMetaDescription(category: ProfessionalCategoryRecord) {
  const label = getMarketplaceCategorySeoLabel(category);
  const taxonomy = getMarketplaceTaxonomyCategoryByPublicSlug(category.slug);
  const specialties = taxonomy?.specialties.slice(0, 3).join(", ");
  const suffix = specialties ? ` Compare support for ${specialties}, and more.` : " Compare specialties, service modes, and location.";

  return `Browse reviewed ${label.toLowerCase()} on Elevare.${suffix}`;
}

export function buildMarketplaceProfessionalMetaDescription(professional: ProfessionalProfileRecord) {
  const role = professional.professionalTitle || professional.categories[0]?.label || "professional";
  const normalizedRole = role.trim().toLowerCase();
  const location = formatSeoLocation({
    city: professional.city,
    region: professional.state,
    countryCode: professional.countryCode,
  });
  const description = isOnlineOnlyMarketplaceProfessional(professional)
    ? `Explore ${professional.displayName}'s online ${normalizedRole} services, specialties, credentials, and availability on Elevare.`
    : `View ${professional.displayName}'s ${normalizedRole} services, specialties, credentials, and availability${location ? ` in ${location}` : ""} on Elevare.`;

  return description.length <= 160 ? description : `${description.slice(0, 157).trimEnd()}...`;
}

export function buildMarketplaceProfessionalSeoTitle(professional: ProfessionalProfileRecord) {
  const role = professional.professionalTitle || professional.categories[0]?.label || "Professional";

  if (isOnlineOnlyMarketplaceProfessional(professional)) {
    const onlineRole = /^online\s/i.test(role) ? role : `Online ${role}`;
    return `${professional.displayName} \u2014 ${onlineRole} | Elevare`;
  }

  const location = formatSeoLocation({
    city: professional.city,
    region: professional.state,
    countryCode: professional.countryCode,
  });

  return `${professional.displayName} \u2014 ${role}${location ? ` in ${location}` : ""} | Elevare`;
}

export function getMarketplaceCategoryResources(categorySlug: string) {
  return CATEGORY_RESOURCE_LINKS[categorySlug] ?? DEFAULT_RESOURCE_LINKS;
}

export function getContextualMarketplaceLink(category: string, product: string) {
  const normalizedCategory = category.trim().toLowerCase();

  if (normalizedCategory === "nutrition") {
    return { href: "/professionals/nutrition/", label: "Find nutrition support" };
  }

  if (["prep", "prep-files"].includes(normalizedCategory) || product === "StageLab") {
    return { href: "/professionals/bodybuilding-physique/", label: "Find a bodybuilding or prep coach" };
  }

  if (normalizedCategory === "coaching") {
    return { href: "/professionals/life-mindset-coaching/", label: "Find a coach" };
  }

  return { href: "/professionals/strength-conditioning/", label: "Find a strength and conditioning coach" };
}
