import type { MetadataRoute } from "next";
import { getAllCategories, getAllPosts } from "@/lib/blog";
import { getNutritionRestaurants } from "@/lib/nutrition";
import { fastFoodNutritionViews, restaurantNutritionViews } from "@/lib/nutrition-pages";
import { absoluteUrl } from "@/lib/site";
import { getAllExercises, getAllWorkoutTemplates } from "@/lib/training";
import { EXERCISE_EQUIPMENT_CATEGORIES, EXERCISE_MUSCLE_CATEGORIES, WORKOUT_GOALS } from "@/lib/training-data";
import { getCalculatorPath, tools } from "@/lib/tools";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "/",
    "/apps",
    "/calculators",
    "/tools",
    "/tools/workout-generator",
    "/nutrition",
    "/exercises",
    "/workouts",
    "/logbook",
    "/stagelab",
    "/elevare",
    "/blog",
  ];
  const [restaurants, exercises, workoutTemplates] = await Promise.all([
    getNutritionRestaurants(),
    getAllExercises(),
    getAllWorkoutTemplates(),
  ]);

  const staticEntries = staticRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date(
      route === "/calculators" || route === "/nutrition" || route === "/exercises" || route === "/workouts"
        || route === "/tools" || route === "/tools/workout-generator"
        ? "2026-06-16"
        : "2026-04-28",
    ),
  }));

  const toolEntries = tools.map((tool) => ({
    url: absoluteUrl(getCalculatorPath(tool.slug)),
    lastModified: new Date("2026-06-16"),
  }));

  const categoryEntries = getAllCategories().map((category) => ({
    url: absoluteUrl(`/blog/category/${category}`),
    lastModified: new Date("2026-04-28"),
  }));

  const postEntries = getAllPosts().map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.date),
  }));

  const exerciseEntries = exercises.map((exercise) => ({
    url: absoluteUrl(`/exercises/${exercise.slug}`),
    lastModified: new Date(exercise.updatedAt ?? "2026-06-16"),
  }));

  const exerciseCategoryEntries = [...EXERCISE_MUSCLE_CATEGORIES, ...EXERCISE_EQUIPMENT_CATEGORIES].map(
    (category) => ({
      url: absoluteUrl(`/exercises/${category.slug}`),
      lastModified: new Date("2026-06-16"),
    }),
  );

  const workoutEntries = workoutTemplates.map((workoutTemplate) => ({
    url: absoluteUrl(`/workouts/${workoutTemplate.slug}`),
    lastModified: new Date(workoutTemplate.updatedAt ?? "2026-06-16"),
  }));

  const workoutGoalEntries = WORKOUT_GOALS.map((goal) => ({
    url: absoluteUrl(`/workouts/${goal.slug}`),
    lastModified: new Date("2026-06-16"),
  }));

  const restaurantEntries = restaurants.flatMap((restaurant) => [
    {
      url: absoluteUrl(`/nutrition/${restaurant.slug}`),
      lastModified: new Date("2026-06-10"),
    },
    ...restaurantNutritionViews.map((view) => ({
      url: absoluteUrl(`/nutrition/${restaurant.slug}/${view}`),
      lastModified: new Date("2026-06-10"),
    })),
  ]);

  const fastFoodEntries = fastFoodNutritionViews.map((view) => ({
    url: absoluteUrl(`/nutrition/fast-food/${view}`),
    lastModified: new Date("2026-06-10"),
  }));

  return [
    ...staticEntries,
    ...toolEntries,
    ...restaurantEntries,
    ...fastFoodEntries,
    ...exerciseEntries,
    ...exerciseCategoryEntries,
    ...workoutEntries,
    ...workoutGoalEntries,
    ...categoryEntries,
    ...postEntries,
  ];
}
