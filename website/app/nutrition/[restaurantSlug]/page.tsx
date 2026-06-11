import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import { NutritionExplorerFallback } from "@/components/nutrition/NutritionExplorerFallback";
import { LogbookCTA } from "@/components/nutrition/LogbookCTA";
import { NutritionDisclaimer } from "@/components/nutrition/NutritionDisclaimer";
import { NutritionExplorer } from "@/components/nutrition/NutritionExplorer";
import { RelatedNutritionLinks } from "@/components/nutrition/RelatedNutritionLinks";
import { getNutritionRestaurants, getRelatedRestaurants, getRestaurantBySlug } from "@/lib/nutrition";
import {
  buildNutritionItemListSchema,
  filterAndSortNutritionItems,
} from "@/lib/nutrition-data";
import { getRestaurantViewLinks, nutritionToolLinks } from "@/lib/nutrition-pages";
import { absoluteUrl, buildMetadata } from "@/lib/site";

type RestaurantNutritionPageProps = {
  params: Promise<{
    restaurantSlug: string;
  }>;
};

const emptyFilters = {
  search: "",
  maxCalories: "",
  minProtein: "",
  maxCarbs: "",
  maxFat: "",
  category: "",
  hideExtras: true,
};

export const dynamicParams = false;

export async function generateStaticParams() {
  const restaurants = await getNutritionRestaurants();
  return restaurants.map((restaurant) => ({
    restaurantSlug: restaurant.slug,
  }));
}

export async function generateMetadata({ params }: RestaurantNutritionPageProps) {
  const { restaurantSlug } = await params;
  const restaurantData = await getRestaurantBySlug(restaurantSlug);

  if (!restaurantData) {
    return buildMetadata({
      title: "Restaurant Nutrition Facts",
      description: "The requested restaurant nutrition page could not be found.",
      pathname: `/nutrition/${restaurantSlug}`,
    });
  }

  return buildMetadata({
    title: `${restaurantData.summary.name} Nutrition Facts`,
    description: `Explore ${restaurantData.summary.name} nutrition facts, calories, protein, carbs, fat, and serving sizes across menu items.`,
    pathname: `/nutrition/${restaurantData.summary.slug}`,
  });
}

export default async function RestaurantNutritionPage({ params }: RestaurantNutritionPageProps) {
  const { restaurantSlug } = await params;
  const restaurantData = await getRestaurantBySlug(restaurantSlug);

  if (!restaurantData) {
    notFound();
  }

  const [relatedRestaurants] = await Promise.all([getRelatedRestaurants(restaurantData.summary)]);
  const schemaItems = filterAndSortNutritionItems({
    items: restaurantData.items,
    variant: "all",
    filters: emptyFilters,
    sort: "lowest-calories",
  });
  const relatedRestaurantLinks = relatedRestaurants.map((restaurant) => ({
    href: `/nutrition/${restaurant.slug}`,
    label: `${restaurant.name} Nutrition Facts`,
  }));
  const restaurantViewLinks = getRestaurantViewLinks(
    restaurantData.summary.name,
    restaurantData.summary.slug,
    "all",
  );
  const pageUrl = absoluteUrl(`/nutrition/${restaurantData.summary.slug}`);

  return (
    <div className="container">
      <StructuredData data={buildNutritionItemListSchema({ items: schemaItems, pageUrl })} />

      <section className="hero">
        <div className="eyebrow">Restaurant nutrition</div>
        <h1>{restaurantData.summary.name} nutrition facts.</h1>
        <p className="page-intro">
          Search, filter, and compare calories, protein, carbs, fat, and serving size across{" "}
          {restaurantData.summary.name} menu items.
        </p>
        <div className="hero-actions">
          <TrackedLink
            className="button button-primary"
            href={`/nutrition/${restaurantData.summary.slug}/high-protein`}
            eventName="nutrition_nav_click"
            eventParams={{
              source_page: `restaurant_${restaurantData.summary.slug}`,
              destination_page: "high_protein",
            }}
          >
            See highest protein items
          </TrackedLink>
          <TrackedLink
            className="button button-secondary"
            href={`/nutrition/${restaurantData.summary.slug}/under-500-calories`}
            eventName="nutrition_nav_click"
            eventParams={{
              source_page: `restaurant_${restaurantData.summary.slug}`,
              destination_page: "under_500_calories",
            }}
          >
            See items under 500 calories
          </TrackedLink>
        </div>

        <div className="hero-proof">
          <article className="proof-card">
            <span className="proof-label">Menu items</span>
            <div className="proof-value">{restaurantData.summary.itemCount}</div>
            <p className="proof-copy">Public items currently available in this restaurant nutrition guide.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Categories</span>
            <div className="proof-value">{restaurantData.summary.categoryCount}</div>
            <p className="proof-copy">Use category filters to narrow the menu down faster.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Macros</span>
            <div className="proof-value">Calories, protein, carbs, fat</div>
            <p className="proof-copy">Sort by the macro view that best matches your goal.</p>
          </article>
        </div>
      </section>

      <Suspense fallback={<NutritionExplorerFallback />}>
        <NutritionExplorer items={restaurantData.items} />
      </Suspense>

      <RelatedNutritionLinks
        title={`More ${restaurantData.summary.name} nutrition views`}
        description="Jump into curated views for higher protein, lower calorie, lower carb, and under-500-calorie options."
        links={restaurantViewLinks}
        sourcePage={`restaurant_${restaurantData.summary.slug}_views`}
      />

      <RelatedNutritionLinks
        title="More restaurant nutrition facts"
        description="Keep exploring related restaurant guides and compare macros across more menus."
        links={relatedRestaurantLinks}
        sourcePage={`restaurant_${restaurantData.summary.slug}_related_restaurants`}
      />

      <RelatedNutritionLinks
        title="Related tools"
        description="Use these tools to estimate calories, protein, macros, and body fat alongside your restaurant menu planning."
        links={nutritionToolLinks}
        sourcePage={`restaurant_${restaurantData.summary.slug}_tools`}
      />

      <LogbookCTA context={`restaurant_${restaurantData.summary.slug}`} />
      <NutritionDisclaimer />
    </div>
  );
}
