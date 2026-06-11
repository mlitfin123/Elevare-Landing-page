import { TrackedLink } from "@/components/TrackedLink";
import type { RestaurantSummary } from "@/lib/nutrition-data";

type RestaurantCardProps = {
  restaurant: RestaurantSummary;
  sourcePage: string;
};

export function RestaurantCard({ restaurant, sourcePage }: RestaurantCardProps) {
  return (
    <article className="panel restaurant-card">
      <span className="meta-pill">{restaurant.itemCount} items</span>
      <h3>{restaurant.name}</h3>
      <p>
        Explore calories, protein, carbs, and fat across {restaurant.itemCount} menu items.
      </p>
      {restaurant.topCategories.length ? (
        <div className="nutrition-chip-row">
          {restaurant.topCategories.map((category) => (
            <span key={category} className="nutrition-chip">
              {category}
            </span>
          ))}
        </div>
      ) : null}
      <div className="button-row">
        <TrackedLink
          className="button button-secondary"
          href={`/nutrition/${restaurant.slug}`}
          eventName="restaurant_open"
          eventParams={{
            restaurant_slug: restaurant.slug,
            restaurant_name: restaurant.name,
            source_page: sourcePage,
          }}
        >
          View nutrition facts
        </TrackedLink>
      </div>
    </article>
  );
}
