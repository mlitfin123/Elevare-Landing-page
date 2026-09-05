import { TrackedLink } from "@/components/TrackedLink";
import type { RestaurantSummary } from "@/lib/nutrition-data";
import { localizeNutritionText } from "@/lib/i18n/catalog-content";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber, localizePathname } from "@/lib/i18n/config";
import { getCatalogMessages } from "@/lib/i18n/catalog-messages";

type RestaurantCardProps = {
  restaurant: RestaurantSummary;
  sourcePage: string;
  locale?: Locale;
};

export function RestaurantCard({ restaurant, sourcePage, locale = "en" }: RestaurantCardProps) {
  const messages = getCatalogMessages(locale).nutrition.card;
  const count = formatNumber(restaurant.itemCount, locale);

  return (
    <article className="panel restaurant-card">
      <span className="meta-pill">{count} {restaurant.itemCount === 1 ? messages.itemSingular : messages.itemPlural}</span>
      <h3>{restaurant.name}</h3>
      <p>{messages.description.replace("{count}", count)}</p>
      {restaurant.topCategories.length ? (
        <div className="nutrition-chip-row">
          {restaurant.topCategories.map((category) => (
            <span key={category} className="nutrition-chip">
              {localizeNutritionText(category, locale)}
            </span>
          ))}
        </div>
      ) : null}
      <div className="button-row">
        <TrackedLink
          className="button button-secondary"
          href={localizePathname(`/nutrition/${restaurant.slug}`, locale)}
          eventName="restaurant_open"
          eventParams={{
            restaurant_slug: restaurant.slug,
            restaurant_name: restaurant.name,
            source_page: sourcePage,
          }}
        >
          {messages.view}
        </TrackedLink>
      </div>
    </article>
  );
}
