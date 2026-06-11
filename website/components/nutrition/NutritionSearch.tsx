"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { TrackedLink } from "@/components/TrackedLink";
import { searchRestaurants, type RestaurantSummary } from "@/lib/nutrition-data";

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

type NutritionSearchProps = {
  restaurants: RestaurantSummary[];
};

function formatMacro(value: number | null, suffix = "") {
  return value == null ? "-" : `${value}${suffix}`;
}

export function NutritionSearch({ restaurants }: NutritionSearchProps) {
  const [restaurantQuery, setRestaurantQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [itemIndex, setItemIndex] = useState<SearchIndexEntry[]>([]);
  const deferredRestaurantQuery = useDeferredValue(restaurantQuery);
  const deferredItemQuery = useDeferredValue(itemQuery);

  useEffect(() => {
    let isMounted = true;

    fetch("/nutrition-search-index.json")
      .then((response) => response.json())
      .then((data: SearchIndexEntry[]) => {
        if (isMounted) {
          setItemIndex(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setItemIndex([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const restaurantResults = useMemo(
    () => searchRestaurants(restaurants, deferredRestaurantQuery).slice(0, 8),
    [restaurants, deferredRestaurantQuery],
  );

  const itemResults = useMemo(() => {
    const normalized = deferredItemQuery.trim().toLowerCase();

    if (normalized.length < 2) {
      return [];
    }

    return itemIndex
      .filter((item) =>
        `${item.restaurantName} ${item.productName} ${item.category ?? ""}`.toLowerCase().includes(normalized),
      )
      .slice(0, 12);
  }, [itemIndex, deferredItemQuery]);

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
        <div className="eyebrow">Search</div>
        <h2 className="section-title">Search restaurants and menu items.</h2>
        <p className="section-copy">
          Search by restaurant name or jump straight to menu items and their macros.
        </p>
      </div>

      <div className="nutrition-search-grid">
        <article className="panel">
          <label className="field">
            <span className="field-label">Search restaurants</span>
            <input
              type="text"
              value={restaurantQuery}
              placeholder="Chipotle, Subway, Starbucks..."
              onChange={(event) => setRestaurantQuery(event.target.value)}
            />
          </label>
          <div className="nutrition-search-results">
            {restaurantResults.length ? (
              restaurantResults.map((restaurant) => (
                <TrackedLink
                  key={restaurant.slug}
                  className="nutrition-search-result"
                  href={`/nutrition/${restaurant.slug}`}
                  eventName="restaurant_open"
                  eventParams={{
                    restaurant_slug: restaurant.slug,
                    restaurant_name: restaurant.name,
                    source_page: "nutrition_index_search",
                  }}
                >
                  <strong>{restaurant.name}</strong>
                  <span>{restaurant.itemCount} items</span>
                </TrackedLink>
              ))
            ) : (
              <p className="footer-copy">No restaurants matched that search.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <label className="field">
            <span className="field-label">Search menu items</span>
            <input
              type="text"
              value={itemQuery}
              placeholder="Chicken bowl, grilled nuggets..."
              onChange={(event) => setItemQuery(event.target.value)}
            />
          </label>
          <div className="nutrition-search-results">
            {deferredItemQuery.trim().length < 2 ? (
              <p className="footer-copy">Type at least 2 characters to search menu items.</p>
            ) : !itemResults.length ? (
              <p className="footer-copy">No menu items matched that search.</p>
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
                    href={`/nutrition/${slug}?q=${encodeURIComponent(item.productName)}`}
                    eventName="nutrition_item_search_click"
                    eventParams={{
                      restaurant_name: item.restaurantName,
                      item_name: item.productName,
                      source_page: "nutrition_index_search",
                    }}
                  >
                    <strong>
                      {item.productName} <span className="nutrition-inline-restaurant">at {item.restaurantName}</span>
                    </strong>
                    <span>
                      {formatMacro(item.calories)} cal | {formatMacro(item.proteinG, "g")} protein |{" "}
                      {formatMacro(item.carbsG, "g")} carbs | {formatMacro(item.fatG, "g")} fat
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
