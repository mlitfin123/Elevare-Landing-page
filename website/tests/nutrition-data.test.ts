import assert from "node:assert/strict";
import test from "node:test";
import {
  applyNutritionVariant,
  buildRestaurantSummaries,
  filterAndSortNutritionItems,
  getFastFoodItems,
  getNutritionTags,
  getProteinPerCalorie,
  isNutritionVariant,
  searchNutritionItems,
  searchRestaurants,
  slugifyRestaurantName,
  sortNutritionItems,
  type NutritionProduct,
} from "../lib/nutrition-data.ts";

const sampleItems: NutritionProduct[] = [
  {
    id: "1",
    restaurantName: "Chipotle",
    productName: "Chicken Bowl",
    category: "Bowls",
    calories: 510,
    proteinG: 40,
    carbsG: 45,
    fatG: 18,
    fiberG: 7,
    sugarG: 4,
    sodiumMg: 920,
    servingDescription: "1 bowl",
    servingSizeValue: 1,
    servingSizeUnit: "bowl",
    gramsPerServing: 420,
    brandName: null,
    sourceUrl: null,
    updatedAt: "2026-06-10T00:00:00.000Z",
  },
  {
    id: "2",
    restaurantName: "Chipotle",
    productName: "Chicken Salad",
    category: "Salads",
    calories: 420,
    proteinG: 38,
    carbsG: 18,
    fatG: 20,
    fiberG: 8,
    sugarG: 3,
    sodiumMg: 810,
    servingDescription: "1 salad",
    servingSizeValue: 1,
    servingSizeUnit: "salad",
    gramsPerServing: 380,
    brandName: null,
    sourceUrl: null,
    updatedAt: "2026-06-10T00:00:00.000Z",
  },
  {
    id: "3",
    restaurantName: "Starbucks",
    productName: "Egg White Bites",
    category: "Breakfast",
    calories: 170,
    proteinG: 13,
    carbsG: 11,
    fatG: 7,
    fiberG: 0,
    sugarG: 2,
    sodiumMg: 470,
    servingDescription: "2 bites",
    servingSizeValue: 2,
    servingSizeUnit: "bites",
    gramsPerServing: 130,
    brandName: null,
    sourceUrl: null,
    updatedAt: "2026-06-10T00:00:00.000Z",
  },
  {
    id: "4",
    restaurantName: "Local Bistro",
    productName: "Steak Plate",
    category: "Entrees",
    calories: 650,
    proteinG: 42,
    carbsG: 24,
    fatG: 32,
    fiberG: 3,
    sugarG: 2,
    sodiumMg: 1100,
    servingDescription: "1 plate",
    servingSizeValue: 1,
    servingSizeUnit: "plate",
    gramsPerServing: 460,
    brandName: null,
    sourceUrl: null,
    updatedAt: "2026-06-10T00:00:00.000Z",
  },
];

test("slug generation and variant guards work for nutrition routes", () => {
  assert.equal(slugifyRestaurantName("McDonald's"), "mcdonalds");
  assert.equal(isNutritionVariant("high-protein"), true);
  assert.equal(isNutritionVariant("unknown-view"), false);
});

test("restaurant and item search are case-insensitive", () => {
  const restaurants = buildRestaurantSummaries(sampleItems);

  assert.equal(searchRestaurants(restaurants, "chip").length, 1);
  assert.equal(searchNutritionItems(sampleItems, "egg white").length, 1);
  assert.equal(searchNutritionItems(sampleItems, "salads").length, 1);
});

test("protein per calorie and dynamic tags are calculated correctly", () => {
  assert.equal(getProteinPerCalorie(sampleItems[1]), 0.0905);
  assert.deepEqual(getNutritionTags(sampleItems[1]), ["High Protein", "Low Calorie", "Low Carb"]);
  assert.deepEqual(getNutritionTags(sampleItems[2]), [
    "Low Calorie",
    "Very Low Calorie",
    "Low Carb",
    "Low Fat",
  ]);
});

test("variant filtering and sorting return the expected menu items", () => {
  assert.equal(applyNutritionVariant(sampleItems, "under-500-calories").length, 2);
  assert.equal(
    sortNutritionItems(sampleItems, "highest-protein-per-calorie")[0]?.productName,
    "Chicken Salad",
  );
});

test("combined nutrition filters narrow items as expected", () => {
  const filtered = filterAndSortNutritionItems({
    items: sampleItems,
    variant: "all",
    filters: {
      search: "chicken",
      maxCalories: "500",
      minProtein: "30",
      maxCarbs: "20",
      maxFat: "25",
      category: "Salads",
    },
    sort: "highest-protein",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.productName, "Chicken Salad");
});

test("fast food filtering keeps allowlisted restaurant items only", () => {
  const fastFoodItems = getFastFoodItems(sampleItems);

  assert.equal(fastFoodItems.length, 3);
  assert.equal(fastFoodItems.some((item) => item.restaurantName === "Local Bistro"), false);
});
