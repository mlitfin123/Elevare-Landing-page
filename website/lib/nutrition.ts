import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import {
  buildRestaurantSummaries,
  getFastFoodItems,
  getPopularNutritionLinks,
  getPopularRestaurants,
  getRestaurantSlugMap,
  type NutritionProduct,
  type RestaurantSummary,
} from "@/lib/nutrition-data";

const generatedDataPath = path.join(process.cwd(), ".generated", "nutrition-data.json");

function readNutritionDataFile(): NutritionProduct[] {
  if (!fs.existsSync(generatedDataPath)) {
    throw new Error(
      "Generated nutrition data is missing. Run the prebuild step with SUPABASE_SERVICE_ROLE_KEY to populate .generated/nutrition-data.json.",
    );
  }

  return JSON.parse(fs.readFileSync(generatedDataPath, "utf8")) as NutritionProduct[];
}

export const getAllNutritionProducts = cache(async () => {
  return readNutritionDataFile();
});

export const getNutritionRestaurants = cache(async () => {
  const products = await getAllNutritionProducts();
  return buildRestaurantSummaries(products);
});

export const getRestaurantLookup = cache(async () => {
  const products = await getAllNutritionProducts();
  return getRestaurantSlugMap(products);
});

export async function getRestaurantBySlug(slug: string) {
  const [products, lookup] = await Promise.all([getAllNutritionProducts(), getRestaurantLookup()]);
  const restaurantName = lookup.nameBySlug.get(slug);

  if (!restaurantName) {
    return null;
  }

  const items = products.filter((product) => product.restaurantName === restaurantName);
  const restaurants = buildRestaurantSummaries(products);
  const summary = restaurants.find((restaurant) => restaurant.slug === slug) ?? null;

  return summary
    ? {
        summary,
        items,
      }
    : null;
}

export async function getPopularNutritionData() {
  const restaurants = await getNutritionRestaurants();

  return {
    popularRestaurants: getPopularRestaurants(restaurants),
    popularLinks: getPopularNutritionLinks(restaurants),
  };
}

export async function getFastFoodRestaurantData() {
  const products = await getAllNutritionProducts();
  const fastFoodItems = getFastFoodItems(products);
  const fastFoodRestaurants = buildRestaurantSummaries(fastFoodItems);

  return {
    items: fastFoodItems,
    restaurants: fastFoodRestaurants,
  };
}

export async function getRelatedRestaurants(currentRestaurant: RestaurantSummary, limit = 4) {
  const restaurants = await getNutritionRestaurants();

  return restaurants.filter((restaurant) => restaurant.slug !== currentRestaurant.slug).slice(0, limit);
}
