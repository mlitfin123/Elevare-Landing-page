import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import { LogbookCTA } from "@/components/nutrition/LogbookCTA";
import { NutritionDisclaimer } from "@/components/nutrition/NutritionDisclaimer";
import { NutritionSearch } from "@/components/nutrition/NutritionSearch";
import { PopularRestaurantLinks } from "@/components/nutrition/PopularRestaurantLinks";
import { RelatedNutritionLinks } from "@/components/nutrition/RelatedNutritionLinks";
import { RestaurantCard } from "@/components/nutrition/RestaurantCard";
import { getAllNutritionProducts, getNutritionRestaurants, getPopularNutritionData } from "@/lib/nutrition";
import { fastFoodGuideLinks, nutritionToolLinks } from "@/lib/nutrition-pages";
import { absoluteUrl, buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Restaurant Nutrition Facts & Macros",
  description:
    "Search restaurant nutrition facts, compare calories and macros, and explore popular menu items from restaurants like Chipotle, Chick-fil-A, Starbucks, and more.",
  pathname: "/nutrition",
});

export default async function NutritionIndexPage() {
  const [products, restaurants, popularData] = await Promise.all([
    getAllNutritionProducts(),
    getNutritionRestaurants(),
    getPopularNutritionData(),
  ]);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Restaurant Nutrition Facts & Macros",
    url: absoluteUrl("/nutrition"),
    description:
      "Search restaurant nutrition facts, compare calories and macros, and explore public menu data across popular restaurants.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: popularData.popularRestaurants.map((restaurant, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: restaurant.name,
        url: absoluteUrl(`/nutrition/${restaurant.slug}`),
      })),
    },
  };

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <section className="hero">
        <div className="eyebrow">Nutrition</div>
        <h1>Restaurant nutrition facts and macros.</h1>
        <p className="page-intro">
          Search restaurants, compare menu items, and review calories, protein, carbs, and fat before you
          order.
        </p>
        <div className="hero-actions">
          <TrackedLink
            className="button button-primary"
            href="/nutrition/fast-food/high-protein"
            eventName="nutrition_nav_click"
            eventParams={{
              source_page: "nutrition_index",
              destination_page: "fast_food_high_protein",
            }}
          >
            Explore fast food high protein picks
          </TrackedLink>
          <TrackedLink
            className="button button-secondary"
            href="/tools/calorie-calculator"
            eventName="nutrition_nav_click"
            eventParams={{
              source_page: "nutrition_index",
              destination_page: "calorie_calculator",
            }}
          >
            Open calorie calculator
          </TrackedLink>
        </div>

        <div className="hero-proof">
          <article className="proof-card">
            <span className="proof-label">Restaurants</span>
            <div className="proof-value">{restaurants.length}</div>
            <p className="proof-copy">Public restaurant nutrition guides you can search and compare.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Menu items</span>
            <div className="proof-value">{products.length.toLocaleString()}</div>
            <p className="proof-copy">Calories and macros pulled from the existing verified restaurant dataset.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Popular searches</span>
            <div className="proof-value">Fast food and chains</div>
            <p className="proof-copy">Jump into common restaurant searches or specific menu item lookups.</p>
          </article>
        </div>
      </section>

      <NutritionSearch restaurants={restaurants} />

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">Popular restaurants</div>
          <h2 className="section-title">Start with the restaurants people search most.</h2>
          <p className="section-copy">
            Explore featured restaurant nutrition pages, then use search to go deeper into menu items and
            macros.
          </p>
        </div>

        <div className="nutrition-restaurant-grid">
          {popularData.popularRestaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.slug}
              restaurant={restaurant}
              sourcePage="nutrition_index_popular_restaurants"
            />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">Popular restaurants</div>
          <h2 className="section-title">Quick links to restaurant nutrition facts.</h2>
          <p className="section-copy">
            Jump directly into featured restaurant guides and compare nutrition facts without digging through
            multiple menus.
          </p>
        </div>

        <PopularRestaurantLinks
          restaurants={popularData.popularRestaurants}
          sourcePage="nutrition_index_popular_links"
        />
      </section>

      <RelatedNutritionLinks
        title="Popular nutrition searches"
        description="Explore the most common restaurant nutrition pages and curated macro views."
        links={popularData.popularLinks}
        sourcePage="nutrition_index_popular_searches"
      />

      <RelatedNutritionLinks
        title="Fast food nutrition guides"
        description="Compare popular fast food items across restaurants by protein, calories, and lighter options."
        links={fastFoodGuideLinks}
        sourcePage="nutrition_index_fast_food_guides"
      />

      <RelatedNutritionLinks
        title="Related tools"
        description="Use these tools to estimate calories, protein, macros, and body fat alongside restaurant menu comparisons."
        links={nutritionToolLinks}
        sourcePage="nutrition_index_tools"
      />

      <LogbookCTA context="nutrition_index" />
      <NutritionDisclaimer />
    </div>
  );
}
