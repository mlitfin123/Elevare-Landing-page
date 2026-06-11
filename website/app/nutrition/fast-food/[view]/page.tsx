import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/StructuredData";
import { NutritionExplorerFallback } from "@/components/nutrition/NutritionExplorerFallback";
import { LogbookCTA } from "@/components/nutrition/LogbookCTA";
import { NutritionDisclaimer } from "@/components/nutrition/NutritionDisclaimer";
import { NutritionExplorer } from "@/components/nutrition/NutritionExplorer";
import { PopularRestaurantLinks } from "@/components/nutrition/PopularRestaurantLinks";
import { RelatedNutritionLinks } from "@/components/nutrition/RelatedNutritionLinks";
import { getFastFoodRestaurantData } from "@/lib/nutrition";
import {
  buildNutritionItemListSchema,
  filterAndSortNutritionItems,
  getPopularRestaurants,
  nutritionVariantConfig,
} from "@/lib/nutrition-data";
import {
  fastFoodNutritionViews,
  getFastFoodVariantCopy,
  getFastFoodViewLinks,
  isFastFoodNutritionView,
  nutritionToolLinks,
} from "@/lib/nutrition-pages";
import { absoluteUrl, buildMetadata } from "@/lib/site";

type FastFoodNutritionVariantPageProps = {
  params: Promise<{
    view: string;
  }>;
};

const emptyFilters = {
  search: "",
  maxCalories: "",
  minProtein: "",
  maxCarbs: "",
  maxFat: "",
  category: "",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return fastFoodNutritionViews.map((view) => ({
    view,
  }));
}

export async function generateMetadata({ params }: FastFoodNutritionVariantPageProps) {
  const { view } = await params;

  if (!isFastFoodNutritionView(view)) {
    return buildMetadata({
      title: "Fast Food Nutrition",
      description: "The requested fast food nutrition view could not be found.",
      pathname: `/nutrition/fast-food/${view}`,
    });
  }

  const pageCopy = getFastFoodVariantCopy(view);

  return buildMetadata({
    title: pageCopy.title,
    description: pageCopy.description,
    pathname: pageCopy.pathname,
  });
}

export default async function FastFoodNutritionVariantPage({
  params,
}: FastFoodNutritionVariantPageProps) {
  const { view } = await params;

  if (!isFastFoodNutritionView(view)) {
    notFound();
  }

  const fastFoodData = await getFastFoodRestaurantData();
  const pageCopy = getFastFoodVariantCopy(view);
  const schemaItems = filterAndSortNutritionItems({
    items: fastFoodData.items,
    variant: pageCopy.variant,
    filters: emptyFilters,
    sort: nutritionVariantConfig[pageCopy.variant].defaultSort,
  });
  const popularRestaurants = getPopularRestaurants(fastFoodData.restaurants);
  const relatedRestaurantLinks = popularRestaurants.map((restaurant) => ({
    href: `/nutrition/${restaurant.slug}`,
    label: `${restaurant.name} Nutrition Facts`,
  }));
  const pageUrl = absoluteUrl(pageCopy.pathname);

  return (
    <div className="container">
      <StructuredData data={buildNutritionItemListSchema({ items: schemaItems, pageUrl })} />

      <section className="hero">
        <div className="eyebrow">Fast food nutrition</div>
        <h1>{pageCopy.headline}</h1>
        <p className="page-intro">{pageCopy.intro}</p>

        <div className="hero-proof">
          <article className="proof-card">
            <span className="proof-label">Restaurants</span>
            <div className="proof-value">{fastFoodData.restaurants.length}</div>
            <p className="proof-copy">Popular restaurants included in this fast food nutrition view.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Items in this view</span>
            <div className="proof-value">{schemaItems.length}</div>
            <p className="proof-copy">Filtered menu items available after applying the current macro view.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Compare</span>
            <div className="proof-value">Calories and macros</div>
            <p className="proof-copy">Search, filter, and sort across multiple restaurants in one place.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">Popular restaurants</div>
          <h2 className="section-title">Popular fast food restaurants in this nutrition view.</h2>
          <p className="section-copy">
            Jump into restaurant-specific nutrition pages once you find a menu you want to compare more closely.
          </p>
        </div>

        <PopularRestaurantLinks
          restaurants={popularRestaurants}
          sourcePage={`fast_food_${view}_popular_restaurants`}
        />
      </section>

      <Suspense fallback={<NutritionExplorerFallback />}>
        <NutritionExplorer items={fastFoodData.items} variant={pageCopy.variant} showRestaurant />
      </Suspense>

      <RelatedNutritionLinks
        title="More fast food nutrition guides"
        description="Switch between curated fast food views for higher protein, lower calorie, and under-500-calorie options."
        links={getFastFoodViewLinks(view)}
        sourcePage={`fast_food_${view}_views`}
      />

      <RelatedNutritionLinks
        title="Restaurant nutrition facts"
        description="Open restaurant-specific pages when you want to go deeper into one menu."
        links={relatedRestaurantLinks}
        sourcePage={`fast_food_${view}_restaurants`}
      />

      <RelatedNutritionLinks
        title="Related tools"
        description="Use these tools to estimate calories, protein, macros, and body fat alongside your restaurant nutrition planning."
        links={nutritionToolLinks}
        sourcePage={`fast_food_${view}_tools`}
      />

      <LogbookCTA context={`fast_food_${view}`} />
      <NutritionDisclaimer />
    </div>
  );
}
