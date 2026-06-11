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
  nutritionVariantConfig,
} from "@/lib/nutrition-data";
import {
  getRestaurantVariantCopy,
  getRestaurantViewLinks,
  isRestaurantNutritionView,
  nutritionToolLinks,
  restaurantNutritionViews,
} from "@/lib/nutrition-pages";
import { absoluteUrl, buildMetadata } from "@/lib/site";

type RestaurantNutritionVariantPageProps = {
  params: Promise<{
    restaurantSlug: string;
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
  hideExtras: true,
};

export const dynamicParams = false;

export async function generateStaticParams() {
  const restaurants = await getNutritionRestaurants();

  return restaurants.flatMap((restaurant) =>
    restaurantNutritionViews.map((view) => ({
      restaurantSlug: restaurant.slug,
      view,
    })),
  );
}

export async function generateMetadata({ params }: RestaurantNutritionVariantPageProps) {
  const { restaurantSlug, view } = await params;

  if (!isRestaurantNutritionView(view)) {
    return buildMetadata({
      title: "Restaurant Nutrition View",
      description: "The requested nutrition view could not be found.",
      pathname: `/nutrition/${restaurantSlug}/${view}`,
    });
  }

  const restaurantData = await getRestaurantBySlug(restaurantSlug);

  if (!restaurantData) {
    return buildMetadata({
      title: "Restaurant Nutrition View",
      description: "The requested nutrition view could not be found.",
      pathname: `/nutrition/${restaurantSlug}/${view}`,
    });
  }

  const pageCopy = getRestaurantVariantCopy(restaurantData.summary.name, restaurantData.summary.slug, view);

  return buildMetadata({
    title: pageCopy.title,
    description: pageCopy.description,
    pathname: pageCopy.pathname,
  });
}

export default async function RestaurantNutritionVariantPage({
  params,
}: RestaurantNutritionVariantPageProps) {
  const { restaurantSlug, view } = await params;

  if (!isRestaurantNutritionView(view)) {
    notFound();
  }

  const restaurantData = await getRestaurantBySlug(restaurantSlug);

  if (!restaurantData) {
    notFound();
  }

  const [relatedRestaurants] = await Promise.all([getRelatedRestaurants(restaurantData.summary)]);
  const pageCopy = getRestaurantVariantCopy(restaurantData.summary.name, restaurantData.summary.slug, view);
  const schemaItems = filterAndSortNutritionItems({
    items: restaurantData.items,
    variant: pageCopy.variant,
    filters: emptyFilters,
    sort: nutritionVariantConfig[pageCopy.variant].defaultSort,
  });
  const relatedRestaurantLinks = relatedRestaurants.map((restaurant) => ({
    href: `/nutrition/${restaurant.slug}`,
    label: `${restaurant.name} Nutrition Facts`,
  }));
  const restaurantViewLinks = getRestaurantViewLinks(
    restaurantData.summary.name,
    restaurantData.summary.slug,
    view,
  );
  const pageUrl = absoluteUrl(pageCopy.pathname);

  return (
    <div className="container">
      <StructuredData data={buildNutritionItemListSchema({ items: schemaItems, pageUrl })} />

      <section className="hero">
        <div className="eyebrow">Restaurant nutrition</div>
        <h1>{pageCopy.headline}</h1>
        <p className="page-intro">{pageCopy.intro}</p>
        <div className="hero-actions">
          <TrackedLink
            className="button button-primary"
            href={`/nutrition/${restaurantData.summary.slug}`}
            eventName="nutrition_nav_click"
            eventParams={{
              source_page: `${restaurantData.summary.slug}_${view}`,
              destination_page: "all_items",
            }}
          >
            View all nutrition facts
          </TrackedLink>
          <TrackedLink
            className="button button-secondary"
            href={restaurantViewLinks[0]?.href ?? `/nutrition/${restaurantData.summary.slug}`}
            eventName="nutrition_nav_click"
            eventParams={{
              source_page: `${restaurantData.summary.slug}_${view}`,
              destination_page: restaurantViewLinks[0]?.href ?? `/nutrition/${restaurantData.summary.slug}`,
            }}
          >
            Explore another nutrition view
          </TrackedLink>
        </div>

        <div className="hero-proof">
          <article className="proof-card">
            <span className="proof-label">Items in this view</span>
            <div className="proof-value">{schemaItems.length}</div>
            <p className="proof-copy">Filtered menu items available in this curated nutrition view.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Restaurant menu items</span>
            <div className="proof-value">{restaurantData.summary.itemCount}</div>
            <p className="proof-copy">Compare this filtered view against the full menu when needed.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Sort options</span>
            <div className="proof-value">Protein, calories, carbs, fat</div>
            <p className="proof-copy">Re-sort the page anytime to compare macro tradeoffs more clearly.</p>
          </article>
        </div>
      </section>

      <Suspense fallback={<NutritionExplorerFallback />}>
        <NutritionExplorer items={restaurantData.items} variant={pageCopy.variant} />
      </Suspense>

      <RelatedNutritionLinks
        title={`More ${restaurantData.summary.name} nutrition views`}
        description="Jump between curated nutrition views for this restaurant and compare the full menu when needed."
        links={restaurantViewLinks}
        sourcePage={`${restaurantData.summary.slug}_${view}_views`}
      />

      <RelatedNutritionLinks
        title="More restaurant nutrition facts"
        description="Keep exploring restaurant guides and compare similar menus side by side."
        links={relatedRestaurantLinks}
        sourcePage={`${restaurantData.summary.slug}_${view}_related_restaurants`}
      />

      <RelatedNutritionLinks
        title="Related tools"
        description="Use these tools to estimate calories, protein, macros, and body fat alongside restaurant menu planning."
        links={nutritionToolLinks}
        sourcePage={`${restaurantData.summary.slug}_${view}_tools`}
      />

      <LogbookCTA context={`${restaurantData.summary.slug}_${view}`} />
      <NutritionDisclaimer />
    </div>
  );
}
