import { getCalculatorPath, getLegacyToolPath, tools } from "./tools.ts";

export type LegacyRedirect = {
  source: string;
  destination: string;
  permanent: true;
};

export type WorkoutSlugRedirect = {
  sourceSlug: string;
  destinationSlug: string;
};

export const RETIRED_WORKOUT_REDIRECTS: readonly WorkoutSlugRedirect[] = [
  { sourceSlug: "3-day-full-body-split-e7b33b83", destinationSlug: "3-day-full-body-split" },
  { sourceSlug: "30-minute-fat-loss-workout-5ac12f3f", destinationSlug: "30-minute-fat-loss-workout" },
  { sourceSlug: "4-day-upper-lower-split-84f3bfd3", destinationSlug: "4-day-upper-lower-split" },
  { sourceSlug: "5-day-bodybuilding-split-ea5552ca", destinationSlug: "5-day-bodybuilding-split" },
  { sourceSlug: "arm-workout-91d859fc", destinationSlug: "arm-workout" },
  { sourceSlug: "back-and-biceps-workout-20a4b22f", destinationSlug: "back-and-biceps-workout" },
  { sourceSlug: "beginner-dumbbell-workout-68727f10", destinationSlug: "beginner-dumbbell-workout" },
  { sourceSlug: "beginner-full-body-workout-f6709e69", destinationSlug: "beginner-full-body-workout" },
  { sourceSlug: "beginner-gym-workout-b05837df", destinationSlug: "beginner-gym-workout" },
  { sourceSlug: "beginner-home-workout-3d914f34", destinationSlug: "beginner-home-workout" },
  { sourceSlug: "beginner-strength-program-f8a74ded", destinationSlug: "beginner-strength-program" },
  { sourceSlug: "beginner-weight-loss-workout-0e94714e", destinationSlug: "beginner-weight-loss-workout" },
  { sourceSlug: "bench-press-focused-workout-64f08a81", destinationSlug: "bench-press-focused-workout" },
  { sourceSlug: "busy-schedule-3-day-workout-8ed6021e", destinationSlug: "busy-schedule-3-day-workout" },
  { sourceSlug: "chest-and-triceps-workout-13b03321", destinationSlug: "chest-and-triceps-workout" },
  { sourceSlug: "core-workout-ec74daad", destinationSlug: "core-workout" },
  { sourceSlug: "deadlift-focused-workout-49beb8f5", destinationSlug: "deadlift-focused-workout" },
  { sourceSlug: "glute-workout-2f090e03", destinationSlug: "glute-workout" },
  { sourceSlug: "hotel-gym-workout-210f0d2d", destinationSlug: "hotel-gym-workout" },
  { sourceSlug: "leg-day-workout-db2adb72", destinationSlug: "leg-day-workout" },
  { sourceSlug: "low-impact-workout-c473a166", destinationSlug: "low-impact-workout" },
  { sourceSlug: "lower-body-workout-dda01356", destinationSlug: "lower-body-workout" },
  { sourceSlug: "powerlifting-beginner-program-5cd14895", destinationSlug: "powerlifting-beginner-program" },
  { sourceSlug: "pull-day-workout-f20c5abb", destinationSlug: "pull-day-workout" },
  { sourceSlug: "push-day-workout-8143b9ab", destinationSlug: "push-day-workout" },
  { sourceSlug: "shoulder-workout-9d73ee6c", destinationSlug: "shoulder-workout" },
  { sourceSlug: "squat-focused-workout-9c6be281", destinationSlug: "squat-focused-workout" },
  { sourceSlug: "strength-and-hypertrophy-workout-863201d8", destinationSlug: "strength-and-hypertrophy-workout" },
  { sourceSlug: "upper-body-workout-5be22e93", destinationSlug: "upper-body-workout" },
  { sourceSlug: "walking-and-strength-workout-db2e5b2e", destinationSlug: "walking-and-strength-workout" },
] as const;

export const MARKETPLACE_FILTER_QUERY_KEYS = [
  "q",
  "query",
  "category",
  "location",
  "specialty",
  "serviceMode",
  "mode",
  "actualFilter",
] as const;

function withSlashVariants(source: string, destination: string): LegacyRedirect[] {
  const normalizedSource = source.endsWith("/") ? source.slice(0, -1) : source;

  return [
    { source: normalizedSource, destination, permanent: true },
    { source: `${normalizedSource}/`, destination, permanent: true },
  ];
}

export function buildLegacyRedirects(): LegacyRedirect[] {
  const workoutRedirects = RETIRED_WORKOUT_REDIRECTS.flatMap((redirect) =>
    withSlashVariants(`/workouts/${redirect.sourceSlug}`, `/workouts/${redirect.destinationSlug}/`),
  );
  const toolRedirects = tools.flatMap((tool) =>
    withSlashVariants(getLegacyToolPath(tool.slug), `${getCalculatorPath(tool.slug)}/`),
  );
  const toolsRootRedirects = withSlashVariants("/tools", "/calculators/");

  return [...workoutRedirects, ...toolRedirects, ...toolsRootRedirects];
}
