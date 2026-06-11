export type NutritionProduct = {
  id: string;
  restaurantName: string;
  productName: string;
  category: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  servingDescription: string | null;
  servingSizeValue: number | null;
  servingSizeUnit: string | null;
  gramsPerServing: number | null;
  brandName: string | null;
  sourceUrl: string | null;
  updatedAt: string;
};

export type NutritionTag =
  | "High Protein"
  | "Very High Protein"
  | "Low Calorie"
  | "Very Low Calorie"
  | "Low Carb"
  | "Low Fat";

export type NutritionSortOption =
  | "lowest-calories"
  | "highest-calories"
  | "highest-protein"
  | "highest-protein-per-calorie"
  | "lowest-carbs"
  | "lowest-fat";

export type NutritionVariant = "all" | "high-protein" | "low-calorie" | "under-500-calories" | "low-carb";

export type NutritionFiltersState = {
  search: string;
  maxCalories: string;
  minProtein: string;
  maxCarbs: string;
  maxFat: string;
  category: string;
};

export type RestaurantSummary = {
  slug: string;
  name: string;
  itemCount: number;
  categoryCount: number;
  topCategories: string[];
};

export const nutritionVariants = [
  "all",
  "high-protein",
  "low-calorie",
  "under-500-calories",
  "low-carb",
] as const satisfies readonly NutritionVariant[];

export const nutritionVariantConfig: Record<
  NutritionVariant,
  {
    label: string;
    defaultSort: NutritionSortOption;
  }
> = {
  all: {
    label: "All items",
    defaultSort: "lowest-calories",
  },
  "high-protein": {
    label: "High protein",
    defaultSort: "highest-protein",
  },
  "low-calorie": {
    label: "Low calorie",
    defaultSort: "lowest-calories",
  },
  "under-500-calories": {
    label: "Under 500 calories",
    defaultSort: "lowest-calories",
  },
  "low-carb": {
    label: "Low carb",
    defaultSort: "lowest-carbs",
  },
};

export const nutritionSortOptions: Array<{ value: NutritionSortOption; label: string }> = [
  { value: "lowest-calories", label: "Lowest calories" },
  { value: "highest-calories", label: "Highest calories" },
  { value: "highest-protein", label: "Highest protein" },
  { value: "highest-protein-per-calorie", label: "Highest protein per calorie" },
  { value: "lowest-carbs", label: "Lowest carbs" },
  { value: "lowest-fat", label: "Lowest fat" },
];

const preferredPopularRestaurants = [
  "Chipotle",
  "Chick-fil-A",
  "Starbucks",
  "McDonald's",
  "Subway",
  "Taco Bell",
  "CAVA",
  "Cava",
  "Panera",
  "Panera Bread",
];

const fastFoodRestaurants = [
  "Arby's",
  "Blaze Pizza",
  "Burger King",
  "CAVA",
  "Cava",
  "Chick-fil-A",
  "Chipotle",
  "Culver's",
  "Firehouse Subs",
  "Five Guys",
  "In-N-Out Burger",
  "Jack in the Box",
  "Jersey Mike's",
  "KFC",
  "Marco's Pizza",
  "McDonald's",
  "Moe's Southwest Grill",
  "Panera",
  "Panera Bread",
  "Papa John's",
  "Panda Express",
  "Peet's Coffee",
  "Pizza Hut",
  "Popeyes",
  "Potbelly",
  "Shake Shack",
  "Starbucks",
  "Subway",
  "Taco Bell",
  "Tim Hortons",
  "Wawa",
  "Wendy's",
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['\u2019]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isNutritionVariant(value: string): value is NutritionVariant {
  return nutritionVariants.includes(value as NutritionVariant);
}

export function slugifyRestaurantName(name: string) {
  return normalizeText(name).replace(/\s+/g, "-");
}

export function restaurantNamesMatch(a: string, b: string) {
  return normalizeText(a) === normalizeText(b);
}

export function getRestaurantSlugMap(products: NutritionProduct[]) {
  const uniqueNames = Array.from(new Set(products.map((product) => product.restaurantName))).sort((a, b) =>
    a.localeCompare(b),
  );
  const slugCounts = new Map<string, number>();
  const slugByName = new Map<string, string>();
  const nameBySlug = new Map<string, string>();

  for (const name of uniqueNames) {
    const baseSlug = slugifyRestaurantName(name);
    const currentCount = slugCounts.get(baseSlug) ?? 0;
    const slug = currentCount === 0 ? baseSlug : `${baseSlug}-${currentCount + 1}`;

    slugCounts.set(baseSlug, currentCount + 1);
    slugByName.set(name, slug);
    nameBySlug.set(slug, name);
  }

  return {
    slugByName,
    nameBySlug,
  };
}

export function getProteinPerCalorie(product: Pick<NutritionProduct, "proteinG" | "calories">) {
  if (!product.calories || product.calories <= 0 || !product.proteinG) {
    return 0;
  }

  return Number((product.proteinG / product.calories).toFixed(4));
}

export function getNutritionTags(product: NutritionProduct): NutritionTag[] {
  const tags: NutritionTag[] = [];
  const protein = product.proteinG ?? 0;
  const calories = product.calories ?? Number.POSITIVE_INFINITY;
  const carbs = product.carbsG ?? Number.POSITIVE_INFINITY;
  const fat = product.fatG ?? Number.POSITIVE_INFINITY;

  if (protein >= 25) tags.push("High Protein");
  if (protein >= 40) tags.push("Very High Protein");
  if (calories <= 500) tags.push("Low Calorie");
  if (calories <= 300) tags.push("Very Low Calorie");
  if (carbs <= 20) tags.push("Low Carb");
  if (fat <= 10) tags.push("Low Fat");

  return tags;
}

export function getServingLabel(product: NutritionProduct) {
  if (product.servingDescription) {
    return product.servingDescription;
  }

  if (product.servingSizeValue && product.servingSizeUnit) {
    return `${product.servingSizeValue} ${product.servingSizeUnit}`;
  }

  if (product.gramsPerServing) {
    return `${product.gramsPerServing} g`;
  }

  return "Serving varies";
}

export function buildRestaurantSummaries(products: NutritionProduct[]) {
  const { slugByName } = getRestaurantSlugMap(products);
  const grouped = new Map<string, NutritionProduct[]>();

  for (const product of products) {
    const list = grouped.get(product.restaurantName) ?? [];
    list.push(product);
    grouped.set(product.restaurantName, list);
  }

  return Array.from(grouped.entries())
    .map(([name, items]) => {
      const categories = Array.from(
        new Set(items.map((item) => item.category).filter((value): value is string => Boolean(value))),
      );

      return {
        slug: slugByName.get(name) ?? slugifyRestaurantName(name),
        name,
        itemCount: items.length,
        categoryCount: categories.length,
        topCategories: categories.slice(0, 3),
      } satisfies RestaurantSummary;
    })
    .sort((a, b) => b.itemCount - a.itemCount || a.name.localeCompare(b.name));
}

export function getPopularRestaurants(restaurants: RestaurantSummary[]) {
  const selected: RestaurantSummary[] = [];
  const remaining = [...restaurants];

  for (const preferred of preferredPopularRestaurants) {
    const index = remaining.findIndex((restaurant) => restaurantNamesMatch(restaurant.name, preferred));

    if (index >= 0) {
      selected.push(remaining[index]);
      remaining.splice(index, 1);
    }
  }

  return [...selected, ...remaining].slice(0, 8);
}

export function getPopularNutritionLinks(restaurants: RestaurantSummary[]) {
  const findRestaurant = (name: string) =>
    restaurants.find((restaurant) => restaurantNamesMatch(restaurant.name, name));
  const links = [];

  const chipotle = findRestaurant("Chipotle");
  const chickFilA = findRestaurant("Chick-fil-A");
  const subway = findRestaurant("Subway");

  if (chipotle) {
    links.push({
      label: "Chipotle Nutrition Facts",
      href: `/nutrition/${chipotle.slug}`,
    });
    links.push({
      label: "Highest Protein Items at Chipotle",
      href: `/nutrition/${chipotle.slug}/high-protein`,
    });
  }

  if (chickFilA) {
    links.push({
      label: "Low Calorie Chick-fil-A Options",
      href: `/nutrition/${chickFilA.slug}/low-calorie`,
    });
  }

  if (subway) {
    links.push({
      label: "Subway Meals Under 500 Calories",
      href: `/nutrition/${subway.slug}/under-500-calories`,
    });
  }

  links.push(
    {
      label: "Fast Food High Protein Options",
      href: "/nutrition/fast-food/high-protein",
    },
    {
      label: "Fast Food Meals Under 500 Calories",
      href: "/nutrition/fast-food/under-500-calories",
    },
  );

  return links;
}

export function isFastFoodRestaurant(name: string) {
  return fastFoodRestaurants.some((restaurant) => restaurantNamesMatch(restaurant, name));
}

export function getFastFoodItems(products: NutritionProduct[]) {
  return products.filter((product) => isFastFoodRestaurant(product.restaurantName));
}

export function getRestaurantCategories(items: NutritionProduct[]) {
  return Array.from(
    new Set(items.map((item) => item.category).filter((value): value is string => Boolean(value))),
  ).sort((a, b) => a.localeCompare(b));
}

export function searchRestaurants(restaurants: RestaurantSummary[], query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return restaurants;
  }

  return restaurants.filter((restaurant) => normalizeText(restaurant.name).includes(normalizedQuery));
}

export function searchNutritionItems(items: NutritionProduct[], query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) =>
    [item.productName, item.restaurantName, item.category ?? ""].some((value) =>
      normalizeText(value).includes(normalizedQuery),
    ),
  );
}

export function applyNutritionVariant(items: NutritionProduct[], variant: NutritionVariant) {
  switch (variant) {
    case "high-protein":
      return items.filter((item) => (item.proteinG ?? 0) > 0);
    case "low-calorie":
      return items.filter((item) => (item.calories ?? Number.POSITIVE_INFINITY) < Number.POSITIVE_INFINITY);
    case "under-500-calories":
      return items.filter((item) => (item.calories ?? Number.POSITIVE_INFINITY) <= 500);
    case "low-carb":
      return items.filter((item) => (item.carbsG ?? Number.POSITIVE_INFINITY) < Number.POSITIVE_INFINITY);
    case "all":
    default:
      return items;
  }
}

export function applyNutritionFilters(items: NutritionProduct[], filters: NutritionFiltersState) {
  return items.filter((item) => {
    if (filters.search && !searchNutritionItems([item], filters.search).length) {
      return false;
    }

    if (filters.category && item.category !== filters.category) {
      return false;
    }

    if (filters.maxCalories) {
      const maxCalories = Number(filters.maxCalories);

      if (Number.isFinite(maxCalories) && (item.calories ?? Number.POSITIVE_INFINITY) > maxCalories) {
        return false;
      }
    }

    if (filters.minProtein) {
      const minProtein = Number(filters.minProtein);

      if (Number.isFinite(minProtein) && (item.proteinG ?? 0) < minProtein) {
        return false;
      }
    }

    if (filters.maxCarbs) {
      const maxCarbs = Number(filters.maxCarbs);

      if (Number.isFinite(maxCarbs) && (item.carbsG ?? Number.POSITIVE_INFINITY) > maxCarbs) {
        return false;
      }
    }

    if (filters.maxFat) {
      const maxFat = Number(filters.maxFat);

      if (Number.isFinite(maxFat) && (item.fatG ?? Number.POSITIVE_INFINITY) > maxFat) {
        return false;
      }
    }

    return true;
  });
}

export function sortNutritionItems(items: NutritionProduct[], sort: NutritionSortOption) {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sort) {
      case "highest-calories":
        return (b.calories ?? -1) - (a.calories ?? -1) || a.productName.localeCompare(b.productName);
      case "highest-protein":
        return (
          (b.proteinG ?? -1) - (a.proteinG ?? -1) ||
          getProteinPerCalorie(b) - getProteinPerCalorie(a) ||
          a.productName.localeCompare(b.productName)
        );
      case "highest-protein-per-calorie":
        return (
          getProteinPerCalorie(b) - getProteinPerCalorie(a) ||
          (b.proteinG ?? -1) - (a.proteinG ?? -1) ||
          a.productName.localeCompare(b.productName)
        );
      case "lowest-carbs":
        return (
          (a.carbsG ?? Number.POSITIVE_INFINITY) - (b.carbsG ?? Number.POSITIVE_INFINITY) ||
          a.productName.localeCompare(b.productName)
        );
      case "lowest-fat":
        return (
          (a.fatG ?? Number.POSITIVE_INFINITY) - (b.fatG ?? Number.POSITIVE_INFINITY) ||
          a.productName.localeCompare(b.productName)
        );
      case "lowest-calories":
      default:
        return (
          (a.calories ?? Number.POSITIVE_INFINITY) - (b.calories ?? Number.POSITIVE_INFINITY) ||
          a.productName.localeCompare(b.productName)
        );
    }
  });

  return sorted;
}

export function filterAndSortNutritionItems({
  items,
  variant,
  filters,
  sort,
}: {
  items: NutritionProduct[];
  variant: NutritionVariant;
  filters: NutritionFiltersState;
  sort: NutritionSortOption;
}) {
  return sortNutritionItems(applyNutritionFilters(applyNutritionVariant(items, variant), filters), sort);
}

export function buildNutritionItemListSchema({
  items,
  pageUrl,
}: {
  items: NutritionProduct[];
  pageUrl: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: items.length,
    url: pageUrl,
    itemListElement: items.slice(0, 20).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${item.restaurantName} ${item.productName}`,
      url: pageUrl,
      additionalProperty: [
        { "@type": "PropertyValue", name: "Calories", value: item.calories ?? "" },
        { "@type": "PropertyValue", name: "Protein", value: item.proteinG ?? "" },
        { "@type": "PropertyValue", name: "Carbs", value: item.carbsG ?? "" },
        { "@type": "PropertyValue", name: "Fat", value: item.fatG ?? "" },
      ],
    })),
  };
}
