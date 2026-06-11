import type { NutritionVariant } from "@/lib/nutrition-data";

export const restaurantNutritionViews = [
  "high-protein",
  "low-calorie",
  "under-500-calories",
  "low-carb",
] as const;

export const fastFoodNutritionViews = [
  "high-protein",
  "low-calorie",
  "under-500-calories",
] as const;

export type RestaurantNutritionView = (typeof restaurantNutritionViews)[number];
export type FastFoodNutritionView = (typeof fastFoodNutritionViews)[number];

type LinkItem = {
  href: string;
  label: string;
};

type VariantCopy = {
  title: string;
  description: string;
  headline: string;
  intro: string;
  pathname: string;
  variant: NutritionVariant;
};

export const nutritionToolLinks: LinkItem[] = [
  {
    href: "/tools/calorie-calculator",
    label: "Calorie Calculator",
  },
  {
    href: "/tools/protein-calculator",
    label: "Protein Calculator",
  },
  {
    href: "/tools/macro-calculator",
    label: "Macro Calculator",
  },
  {
    href: "/tools/body-fat-calculator",
    label: "Body Fat Calculator",
  },
];

export const fastFoodGuideLinks: LinkItem[] = [
  {
    href: "/nutrition/fast-food/high-protein",
    label: "Fast Food High Protein Options",
  },
  {
    href: "/nutrition/fast-food/low-calorie",
    label: "Fast Food Low Calorie Options",
  },
  {
    href: "/nutrition/fast-food/under-500-calories",
    label: "Fast Food Meals Under 500 Calories",
  },
];

export function isRestaurantNutritionView(value: string): value is RestaurantNutritionView {
  return restaurantNutritionViews.includes(value as RestaurantNutritionView);
}

export function isFastFoodNutritionView(value: string): value is FastFoodNutritionView {
  return fastFoodNutritionViews.includes(value as FastFoodNutritionView);
}

export function getRestaurantVariantCopy(
  restaurantName: string,
  restaurantSlug: string,
  view: RestaurantNutritionView,
): VariantCopy {
  switch (view) {
    case "high-protein":
      return {
        title: `Highest Protein Items at ${restaurantName}`,
        description: `Compare the highest protein menu items at ${restaurantName}, including calories, carbs, fat, and protein per calorie.`,
        headline: `Highest protein items at ${restaurantName}.`,
        intro: `Use this page to compare the highest protein items at ${restaurantName} and see how each option stacks up for calories, carbs, fat, and protein per calorie.`,
        pathname: `/nutrition/${restaurantSlug}/high-protein`,
        variant: "high-protein",
      };
    case "low-calorie":
      return {
        title: `Low Calorie ${restaurantName} Options`,
        description: `Browse lower calorie ${restaurantName} menu items and compare calories, protein, carbs, fat, and serving sizes before you order.`,
        headline: `Low calorie ${restaurantName} options.`,
        intro: `Browse lower calorie items from ${restaurantName} and compare macros side by side when you want to keep calories in check without guessing.`,
        pathname: `/nutrition/${restaurantSlug}/low-calorie`,
        variant: "low-calorie",
      };
    case "under-500-calories":
      return {
        title: `${restaurantName} Meals Under 500 Calories`,
        description: `See ${restaurantName} items with 500 calories or less and compare calories, protein, carbs, fat, and serving sizes.`,
        headline: `${restaurantName} items under 500 calories.`,
        intro: `This view filters ${restaurantName} menu items down to 500 calories or less so you can compare smaller meals, lighter add-ons, and better high-protein tradeoffs.`,
        pathname: `/nutrition/${restaurantSlug}/under-500-calories`,
        variant: "under-500-calories",
      };
    case "low-carb":
      return {
        title: `Low Carb ${restaurantName} Options`,
        description: `Compare lower carb ${restaurantName} menu items and review calories, protein, fat, serving size, and carb counts in one place.`,
        headline: `Low carb ${restaurantName} options.`,
        intro: `Use this page to sort ${restaurantName} items by carbs and find lower carb options while still keeping protein, calories, and fat in view.`,
        pathname: `/nutrition/${restaurantSlug}/low-carb`,
        variant: "low-carb",
      };
  }
}

export function getFastFoodVariantCopy(view: FastFoodNutritionView): VariantCopy {
  switch (view) {
    case "high-protein":
      return {
        title: "Fast Food High Protein Options",
        description: "Compare higher protein fast food menu items across popular restaurants, including calories, carbs, fat, and protein per calorie.",
        headline: "Fast food high protein options.",
        intro: "Compare higher protein menu items across popular fast food restaurants when you want a faster way to narrow down better macro choices.",
        pathname: "/nutrition/fast-food/high-protein",
        variant: "high-protein",
      };
    case "low-calorie":
      return {
        title: "Fast Food Low Calorie Options",
        description: "Browse lower calorie fast food items across popular restaurants and compare calories, protein, carbs, fat, and serving sizes.",
        headline: "Fast food low calorie options.",
        intro: "Use this view to compare lower calorie fast food options across multiple restaurants without bouncing between separate nutrition PDFs and menus.",
        pathname: "/nutrition/fast-food/low-calorie",
        variant: "low-calorie",
      };
    case "under-500-calories":
      return {
        title: "Fast Food Meals Under 500 Calories",
        description: "See fast food menu items with 500 calories or less and compare calories, protein, carbs, fat, and serving sizes across restaurants.",
        headline: "Fast food meals under 500 calories.",
        intro: "This view filters popular fast food items down to 500 calories or less so you can compare lighter meals and better high-protein options across restaurants.",
        pathname: "/nutrition/fast-food/under-500-calories",
        variant: "under-500-calories",
      };
  }
}

export function getRestaurantViewLinks(
  restaurantName: string,
  restaurantSlug: string,
  currentView: "all" | RestaurantNutritionView = "all",
) {
  const links: Array<LinkItem & { view: "all" | RestaurantNutritionView }> = [
    {
      href: `/nutrition/${restaurantSlug}`,
      label: `${restaurantName} Nutrition Facts`,
      view: "all",
    },
    {
      href: `/nutrition/${restaurantSlug}/high-protein`,
      label: `Highest Protein Items at ${restaurantName}`,
      view: "high-protein",
    },
    {
      href: `/nutrition/${restaurantSlug}/low-calorie`,
      label: `Low Calorie ${restaurantName} Options`,
      view: "low-calorie",
    },
    {
      href: `/nutrition/${restaurantSlug}/under-500-calories`,
      label: `${restaurantName} Meals Under 500 Calories`,
      view: "under-500-calories",
    },
    {
      href: `/nutrition/${restaurantSlug}/low-carb`,
      label: `Low Carb ${restaurantName} Options`,
      view: "low-carb",
    },
  ];

  return links.filter((link) => link.view !== currentView).map(({ view: _view, ...link }) => link);
}

export function getFastFoodViewLinks(currentView: FastFoodNutritionView) {
  return fastFoodGuideLinks.filter((link) => !link.href.endsWith(`/${currentView}`));
}
