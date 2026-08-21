export const QUICK_ANALYSIS_SOURCES = [
  "homepage",
  "stagelab",
  "body-fat-calculator",
  "body-fat-caliper-calculator",
  "contest-prep-countdown",
  "competition-timeline",
  "show-day-checklist",
  "calculators-hub",
  "prep-files",
  "prep-blog",
] as const;

export type QuickAnalysisSource = (typeof QUICK_ANALYSIS_SOURCES)[number];

const quickAnalysisSourceSet = new Set<string>(QUICK_ANALYSIS_SOURCES);

export function normalizeQuickAnalysisSource(value: unknown): QuickAnalysisSource | undefined {
  return typeof value === "string" && quickAnalysisSourceSet.has(value)
    ? (value as QuickAnalysisSource)
    : undefined;
}

export function getQuickAnalysisEntryHref(source: QuickAnalysisSource) {
  return `/stagelab/quick-analysis/?source=${encodeURIComponent(source)}`;
}
