export const TOOL_GROUPS = {
  nutrition: {
    slug: "nutrition-weight-loss",
    title: "Nutrition & Weight Loss",
    description: "Nutrition planning, calorie targets, and weight-loss support tools.",
  },
  strength: {
    slug: "strength-training",
    title: "Strength Training",
    description: "Simple tools for estimating max strength and planning training loads.",
  },
  prep: {
    slug: "bodybuilding-contest-prep",
    title: "Bodybuilding & Contest Prep",
    description: "Countdowns, timelines, and show-day planning for physique prep.",
  },
} as const;

export type ToolGroupKey = keyof typeof TOOL_GROUPS;

export type ToolDefinition = {
  slug: string;
  title: string;
  metaDescription: string;
  intro: string;
  group: ToolGroupKey;
  relatedSlugs: string[];
};

export const tools = [
  {
    slug: "calorie-calculator",
    title: "Calorie Calculator",
    metaDescription:
      "Estimate maintenance calories and view simple cutting or gaining targets with the Elevare calorie calculator.",
    intro:
      "Use this calorie calculator to estimate maintenance calories first, then view practical calorie targets for fat loss or leaner weight gain.",
    group: "nutrition",
    relatedSlugs: ["maintenance-calorie-calculator", "macro-calculator", "protein-calculator"],
  },
  {
    slug: "maintenance-calorie-calculator",
    title: "Maintenance Calorie Calculator",
    metaDescription:
      "Estimate your daily maintenance calories using the Mifflin-St Jeor formula and activity level.",
    intro:
      "Use this maintenance calorie calculator to estimate how many calories you may need to hold your current weight before making any cut or bulk adjustments.",
    group: "nutrition",
    relatedSlugs: ["calorie-calculator", "goal-weight-timeline-calculator", "macro-calculator"],
  },
  {
    slug: "calorie-burn-calculator",
    title: "Calorie Burn Calculator",
    metaDescription:
      "Estimate calories burned from walking, running, lifting, cycling, swimming, and other common activities.",
    intro:
      "Use this calorie burn calculator to estimate session energy expenditure based on your bodyweight, activity, and duration.",
    group: "nutrition",
    relatedSlugs: ["calorie-calculator", "maintenance-calorie-calculator", "goal-weight-timeline-calculator"],
  },
  {
    slug: "body-fat-calculator",
    title: "Body Fat Calculator",
    metaDescription:
      "Estimate body fat percentage using the U.S. Navy formula with support for inches or centimeters.",
    intro:
      "Use this body fat calculator to estimate body fat percentage from body measurements using the U.S. Navy method.",
    group: "nutrition",
    relatedSlugs: ["goal-weight-timeline-calculator", "protein-calculator", "contest-prep-countdown"],
  },
  {
    slug: "one-rep-max-calculator",
    title: "1RM Calculator",
    metaDescription:
      "Estimate your one-rep max with the Epley formula and view common training percentages.",
    intro:
      "Use this 1RM calculator to estimate your one-rep max and quickly see working weights for common training percentages.",
    group: "strength",
    relatedSlugs: ["protein-calculator", "macro-calculator", "calorie-calculator"],
  },
  {
    slug: "protein-calculator",
    title: "Protein Calculator",
    metaDescription:
      "Estimate a practical daily protein target for general health, fat loss, muscle gain, or contest prep.",
    intro:
      "Use this protein calculator to estimate a realistic daily protein range based on your bodyweight and current goal.",
    group: "nutrition",
    relatedSlugs: ["macro-calculator", "calorie-calculator", "body-fat-calculator"],
  },
  {
    slug: "macro-calculator",
    title: "Macro Calculator",
    metaDescription:
      "Build simple macro targets from calories, bodyweight, and goal with high, moderate, or low-carb options.",
    intro:
      "Use this macro calculator to turn a calorie target into practical protein, fat, and carb ranges you can actually use.",
    group: "nutrition",
    relatedSlugs: ["protein-calculator", "calorie-calculator", "maintenance-calorie-calculator"],
  },
  {
    slug: "goal-weight-timeline-calculator",
    title: "Goal Weight Timeline Calculator",
    metaDescription:
      "Estimate how long it may take to reach a goal weight based on your weekly rate of loss or gain.",
    intro:
      "Use this goal weight timeline calculator to estimate how many weeks your plan may take and what target date that pace points to.",
    group: "nutrition",
    relatedSlugs: ["calorie-calculator", "body-fat-calculator", "calorie-burn-calculator"],
  },
  {
    slug: "contest-prep-countdown",
    title: "Contest Prep Countdown",
    metaDescription:
      "See how many days and weeks out you are from show day and which prep phase you are currently in.",
    intro:
      "Use this contest prep countdown to see how far out your show is and where you are in the overall prep timeline.",
    group: "prep",
    relatedSlugs: ["competition-timeline-generator", "show-day-checklist-generator", "body-fat-calculator"],
  },
  {
    slug: "competition-timeline-generator",
    title: "Competition Timeline Generator",
    metaDescription:
      "Generate a simple contest prep milestone timeline based on your show date, experience level, and division.",
    intro:
      "Use this competition timeline generator to map out the major milestones between now and show day.",
    group: "prep",
    relatedSlugs: ["contest-prep-countdown", "show-day-checklist-generator", "goal-weight-timeline-calculator"],
  },
  {
    slug: "show-day-checklist-generator",
    title: "Show Day Checklist Generator",
    metaDescription:
      "Generate a contest day checklist for documents, clothing, food, pump-up gear, grooming, and travel.",
    intro:
      "Use this show day checklist generator to create a cleaner packing list and reduce last-minute stress before stepping on stage.",
    group: "prep",
    relatedSlugs: ["competition-timeline-generator", "contest-prep-countdown", "body-fat-calculator"],
  },
] as const satisfies readonly ToolDefinition[];

export type ToolSlug = (typeof tools)[number]["slug"];
export type ToolRecord = (typeof tools)[number];

export const toolMap: Record<ToolSlug, ToolRecord> = Object.fromEntries(
  tools.map((tool) => [tool.slug, tool]),
) as Record<ToolSlug, ToolRecord>;

export function getTool(slug: string): ToolRecord | null {
  return toolMap[slug as ToolSlug] ?? null;
}

export function getToolsByGroup(group: ToolGroupKey) {
  return tools.filter((tool) => tool.group === group);
}
