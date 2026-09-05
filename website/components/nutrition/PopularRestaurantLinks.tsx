import { TrackedLink } from "@/components/TrackedLink";
import type { RestaurantSummary } from "@/lib/nutrition-data";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";

type PopularRestaurantLinksProps = {
  restaurants: RestaurantSummary[];
  sourcePage: string;
  locale?: Locale;
};

export function PopularRestaurantLinks({ restaurants, sourcePage, locale = "en" }: PopularRestaurantLinksProps) {
  return (
    <div className="nutrition-link-cloud">
      {restaurants.map((restaurant) => (
        <TrackedLink
          key={restaurant.slug}
          className="nutrition-link-pill"
          href={localizePathname(`/nutrition/${restaurant.slug}`, locale)}
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
