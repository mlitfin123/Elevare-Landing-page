"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import { TrackedLink } from "@/components/TrackedLink";
import { searchRestaurants, type RestaurantSummary } from "@/lib/nutrition-data";
import { localizeNutritionText } from "@/lib/i18n/catalog-content";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber, localizePathname } from "@/lib/i18n/config";
import { getCatalogMessages } from "@/lib/i18n/catalog-messages";

type SearchIndexEntry = {
  id: string;
  restaurantName: string;
  productName: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  category: string | null;
};

type CompactSearchIndex = {
  r: string[];
  i: Array<[number, string, number | null, number | null, number | null, number | null, string | null]>;
};

type NutritionSearchProps = {
  restaurants: RestaurantSummary[];
  locale?: Locale;
};

function formatMacro(value: number | null, suffix = "") {
  return value == null ? "-" : `${value}${suffix}`;
}

export function NutritionSearch({ restaurants, locale = "en" }: NutritionSearchProps) {
  const messages = getCatalogMessages(locale).nutrition.search;
  const [restaurantQuery, setRestaurantQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [itemIndex, setItemIndex] = useState<SearchIndexEntry[]>([]);
  const [itemIndexStatus, setItemIndexStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const itemIndexRequest = useRef<Promise<void> | null>(null);
  const deferredRestaurantQuery = useDeferredValue(restaurantQuery);
  const deferredItemQuery = useDeferredValue(itemQuery);

  function loadItemIndex() {
    if (itemIndexRequest.current || itemIndexStatus === "ready") {
      return;
    }

    setItemIndexStatus("loading");
    itemIndexRequest.current = fetch("/nutrition-search-index.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Nutrition search index could not be loaded.");
        }

        return response.json() as Promise<CompactSearchIndex>;
      })
      .then((data) => {
        if (!Array.isArray(data.r) || !Array.isArray(data.i)) {
          throw new Error("Nutrition search index is invalid.");
        }

        setItemIndex(
          data.i.flatMap((item, index) => {
            const restaurantName = data.r[item[0]];

            if (!restaurantName || !item[1]) {
              return [];
            }

            return [{
              id: `${item[0]}-${index}`,
              restaurantName,
              productName: item[1],
              calories: item[2],
              proteinG: item[3],
              carbsG: item[4],
              fatG: item[5],
              category: item[6],
            }];
          }),
        );
        setItemIndexStatus("ready");
      })
      .catch(() => {
        itemIndexRequest.current = null;
        setItemIndex([]);
        setItemIndexStatus("error");
      });
  }

  const restaurantResults = useMemo(
    () => searchRestaurants(restaurants, deferredRestaurantQuery).slice(0, 8),
    [restaurants, deferredRestaurantQuery],
  );

  const itemResults = useMemo(() => {
    const normalized = deferredItemQuery.trim().toLocaleLowerCase(locale);

    if (normalized.length < 2) {
      return [];
    }

    return itemIndex
      .filter((item) =>
        `${item.restaurantName} ${item.productName} ${item.category ?? ""} ${localizeNutritionText(item.productName, locale) ?? ""} ${localizeNutritionText(item.category, locale) ?? ""}`
          .toLocaleLowerCase(locale)
          .includes(normalized),
      )
      .slice(0, 12);
  }, [itemIndex, deferredItemQuery, locale]);

  const slugByRestaurant = useMemo(
    () =>
      new Map(
        restaurants.map((restaurant) => [restaurant.name.toLowerCase(), restaurant.slug]),
      ),
    [restaurants],
  );

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">{messages.eyebrow}</div>
        <h2 className="section-title">{messages.title}</h2>
        <p className="section-copy">{messages.copy}</p>
      </div>

      <div className="nutrition-search-grid">
        <article className="panel">
          <label className="field">
            <span className="field-label">{messages.restaurantsLabel}</span>
            <input
              type="text"
              value={restaurantQuery}
              placeholder={messages.restaurantsPlaceholder}
              onChange={(event) => setRestaurantQuery(event.target.value)}
            />
          </label>
          <div className="nutrition-search-results">
            {restaurantResults.length ? (
              restaurantResults.map((restaurant) => (
                <TrackedLink
                  key={restaurant.slug}
                  className="nutrition-search-result"
                  href={localizePathname(`/nutrition/${restaurant.slug}`, locale)}
                  eventName="restaurant_open"
                  eventParams={{
                    restaurant_slug: restaurant.slug,
                    restaurant_name: restaurant.name,
                    source_page: "nutrition_index_search",
                  }}
                >
                  <strong>{restaurant.name}</strong>
                  <span>{formatNumber(restaurant.itemCount, locale)} {restaurant.itemCount === 1 ? messages.itemSingular : messages.itemPlural}</span>
                </TrackedLink>
              ))
            ) : (
              <p className="footer-copy">{messages.noRestaurants}</p>
            )}
          </div>
        </article>

        <article className="panel">
          <label className="field">
            <span className="field-label">{messages.itemsLabel}</span>
            <input
              type="text"
              value={itemQuery}
              placeholder={messages.itemsPlaceholder}
              onFocus={loadItemIndex}
              onChange={(event) => {
                const nextValue = event.target.value;
                setItemQuery(nextValue);

                if (nextValue.trim().length >= 2) {
                  loadItemIndex();
                }
              }}
            />
          </label>
          <div className="nutrition-search-results">
            {deferredItemQuery.trim().length < 2 ? (
              <p className="footer-copy">{messages.typeMore}</p>
            ) : itemIndexStatus === "loading" || itemIndexStatus === "idle" ? (
              <p className="footer-copy">{messages.loading}</p>
            ) : itemIndexStatus === "error" ? (
              <p className="footer-copy">{messages.unavailable}</p>
            ) : !itemResults.length ? (
              <p className="footer-copy">{messages.noItems}</p>
            ) : (
              itemResults.map((item) => {
                const slug = slugByRestaurant.get(item.restaurantName.toLowerCase());

                if (!slug) {
                  return null;
                }

                return (
                  <TrackedLink
                    key={item.id}
                    className="nutrition-search-result"
                    href={`${localizePathname(`/nutrition/${slug}`, locale)}?q=${encodeURIComponent(localizeNutritionText(item.productName, locale) ?? item.productName)}`}
                    eventName="nutrition_item_search_click"
                    eventParams={{
                      restaurant_name: item.restaurantName,
                      item_name: item.productName,
                      source_page: "nutrition_index_search",
                    }}
                  >
                    <strong>
                      {localizeNutritionText(item.productName, locale)} <span className="nutrition-inline-restaurant">{messages.at} {item.restaurantName}</span>
                    </strong>
                    <span>
                      {formatMacro(item.calories)} {messages.caloriesShort} | {formatMacro(item.proteinG, "g")} {messages.protein} |{" "}
                      {formatMacro(item.carbsG, "g")} {messages.carbs} | {formatMacro(item.fatG, "g")} {messages.fat}
                    </span>
                  </TrackedLink>
                );
              })
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
