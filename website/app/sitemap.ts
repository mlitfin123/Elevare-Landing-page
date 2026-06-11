import type { MetadataRoute } from "next";
import { getAllCategories, getAllPosts } from "@/lib/blog";
import { getNutritionRestaurants } from "@/lib/nutrition";
import { fastFoodNutritionViews, restaurantNutritionViews } from "@/lib/nutrition-pages";
import { absoluteUrl } from "@/lib/site";
import { tools } from "@/lib/tools";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["/", "/apps", "/tools", "/nutrition", "/logbook", "/stagelab", "/elevare", "/blog"];
  const restaurants = await getNutritionRestaurants();

  const staticEntries = staticRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date(route === "/tools" || route === "/nutrition" ? "2026-06-10" : "2026-04-28"),
  }));

  const toolEntries = tools.map((tool) => ({
    url: absoluteUrl(`/tools/${tool.slug}`),
    lastModified: new Date("2026-06-10"),
  }));

  const categoryEntries = getAllCategories().map((category) => ({
    url: absoluteUrl(`/blog/category/${category}`),
    lastModified: new Date("2026-04-28"),
  }));

  const postEntries = getAllPosts().map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.date),
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
    ...categoryEntries,
    ...postEntries,
  ];
}
