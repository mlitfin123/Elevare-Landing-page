export const CLIENT_GOAL_OPTIONS = [
  "Build Muscle",
  "Lose Weight",
  "Lose Body Fat",
  "Get Stronger",
  "Body Recomposition",
  "Improve General Fitness",
  "Improve Conditioning",
  "Improve Endurance",
  "Improve Running",
  "Prepare for a Race",
  "Prepare for a Competition",
  "Improve Athletic Performance",
  "Improve Mobility",
  "Improve Flexibility",
  "Improve Nutrition",
  "Build Healthier Habits",
  "Increase Accountability",
  "Improve Confidence",
  "Reduce Everyday Stress",
  "Improve Mindfulness",
  "Improve General Wellness",
  "Healthy Aging",
  "Learn to Exercise",
  "Return to Exercise",
  "Lifestyle Change",
  "Other",
] as const;

export const CLIENT_SERVICE_MODE_OPTIONS = [
  { value: "in_person", label: "In Person" },
  { value: "online", label: "Online" },
  { value: "either", label: "Either" },
] as const;

export const CLIENT_RADIUS_OPTIONS = [
  { value: "5", label: "5 miles" },
  { value: "10", label: "10 miles" },
  { value: "25", label: "25 miles" },
  { value: "50", label: "50 miles" },
  { value: "", label: "No preference" },
] as const;

export const CLIENT_TIMELINE_OPTIONS = [
  { value: "asap", label: "As soon as possible" },
  { value: "within_few_weeks", label: "Within a few weeks" },
  { value: "within_month", label: "Within a month" },
  { value: "just_exploring", label: "Just exploring" },
] as const;

export const CLIENT_EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "not_sure", label: "Not sure" },
  { value: "not_applicable", label: "Not applicable" },
] as const;

export const CLIENT_BUDGET_RANGE_OPTIONS = [
  { value: "under_50", label: "Under $50", minCents: 0, maxCents: 5000 },
  { value: "50_100", label: "$50-$100", minCents: 5000, maxCents: 10000 },
  { value: "100_200", label: "$100-$200", minCents: 10000, maxCents: 20000 },
  { value: "200_300", label: "$200-$300", minCents: 20000, maxCents: 30000 },
  { value: "300_plus", label: "$300+", minCents: 30000, maxCents: null },
  { value: "flexible", label: "Flexible / Not sure", minCents: null, maxCents: null },
] as const;

export const CLIENT_BUDGET_BASIS_OPTIONS = [
  { value: "per_session", label: "Per session" },
  { value: "per_month", label: "Per month" },
  { value: "depends", label: "Depends on the service" },
] as const;

export const CLIENT_SUPPORT_FREQUENCY_OPTIONS = [
  { value: "one_time", label: "One-time consultation" },
  { value: "weekly", label: "About once per week" },
  { value: "multiple_weekly", label: "Multiple times per week" },
  { value: "ongoing", label: "Ongoing coaching" },
  { value: "not_sure", label: "Not sure" },
] as const;

export const CLIENT_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  personal_training: "Fitness, strength & body composition",
  strength_conditioning: "Strength, power & athletic development",
  bodybuilding_physique: "Muscle building, contest prep & posing",
  strength_sports: "Powerlifting, weightlifting & strongman",
  running_endurance: "Running, racing & endurance",
  sports_performance: "Speed, agility & athletic performance",
  nutrition: "Nutrition coaching & healthy eating",
  dietetics: "Credentialed nutrition support",
  health_wellness_coaching: "Habits, accountability & lifestyle support",
  life_mindset_coaching: "Mindset, confidence & personal growth",
  yoga: "Yoga, mobility & mind-body practice",
  pilates: "Core strength, posture & movement",
  mobility_movement: "Mobility, stretching & movement quality",
  mindfulness_breathwork: "Mindfulness, breathwork & stress support",
  recovery_bodywork: "Recovery, massage & assisted stretching",
  special_population_fitness: "Fitness for specific life stages and needs",
};

const LEGACY_GOAL_LABELS: Record<string, string> = {
  fat_loss: "Lose Body Fat",
  muscle_gain_body_recomposition: "Body Recomposition",
  strength_training: "Get Stronger",
  general_fitness: "Improve General Fitness",
  beginner_coaching: "Learn to Exercise",
  mobility_flexibility: "Improve Mobility",
  athletic_performance: "Improve Athletic Performance",
  senior_fitness: "Healthy Aging",
  competition_prep: "Prepare for a Competition",
};

const LEGACY_BUDGET_RANGES: Record<string, string> = {
  "50_70": "50_100",
  "70_90": "50_100",
  "90_120": "100_200",
  "120_plus": "flexible",
};

export function toClientServiceMode(value: unknown) {
  if (value === "both" || value === "hybrid") return "either";
  return value === "in_person" || value === "online" ? value : "";
}

export function toDatabaseServiceMode(value: string) {
  if (value === "either") return "both";
  return value === "in_person" || value === "online" ? value : null;
}

export function normalizeClientTimeline(value: unknown) {
  if (value === "this_week") return "asap";
  if (value === "within_two_weeks") return "within_few_weeks";
  return typeof value === "string" ? value : "";
}

export function normalizeClientBudgetRange(value: unknown) {
  if (typeof value !== "string") return "";
  return LEGACY_BUDGET_RANGES[value] ?? value;
}

export function getBudgetCents(value: string) {
  const option = CLIENT_BUDGET_RANGE_OPTIONS.find((entry) => entry.value === value);
  return {
    budgetMinCents: option?.minCents ?? null,
    budgetMaxCents: option?.maxCents ?? null,
  };
}

export function normalizeClientGoalTags(structuredGoals: unknown, legacyGoals: unknown) {
  if (Array.isArray(structuredGoals)) {
    const values = structuredGoals.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()));
    if (values.length > 0) return [...new Set(values)];
  }

  if (!Array.isArray(legacyGoals)) return [];
  return [...new Set(
    legacyGoals
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => LEGACY_GOAL_LABELS[entry])
      .filter((entry): entry is string => Boolean(entry)),
  )];
}

export function getPreferenceLabel(
  options: readonly { value: string; label: string }[],
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? "";
}
