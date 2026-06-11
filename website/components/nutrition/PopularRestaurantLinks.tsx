import { TrackedLink } from "@/components/TrackedLink";
import type { RestaurantSummary } from "@/lib/nutrition-data";

type PopularRestaurantLinksProps = {
  restaurants: RestaurantSummary[];
  sourcePage: string;
};

export function PopularRestaurantLinks({ restaurants, sourcePage }: PopularRestaurantLinksProps) {
  return (
    <div className="nutrition-link-cloud">
      {restaurants.map((restaurant) => (
        <TrackedLink
          key={restaurant.slug}
          className="nutrition-link-pill"
          href={`/nutrition/${restaurant.slug}`}
          eventName="restaurant_open"
          eventParams={{
            restaurant_slug: restaurant.slug,
            restaurant_name: restaurant.name,
            source_page: sourcePage,
          }}
        >
          {restaurant.name}
        </TrackedLink>
      ))}
    </div>
  );
}
