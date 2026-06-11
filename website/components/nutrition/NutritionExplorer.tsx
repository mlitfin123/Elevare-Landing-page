"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NutritionFilters } from "@/components/nutrition/NutritionFilters";
import { NutritionItemCard } from "@/components/nutrition/NutritionItemCard";
import { NutritionSort } from "@/components/nutrition/NutritionSort";
import { NutritionTable } from "@/components/nutrition/NutritionTable";
import {
  filterAndSortNutritionItems,
  getRestaurantCategories,
  nutritionVariantConfig,
  type NutritionFiltersState,
  type NutritionProduct,
  type NutritionSortOption,
  type NutritionVariant,
} from "@/lib/nutrition-data";

const emptyFilters: NutritionFiltersState = {
  search: "",
  maxCalories: "",
  minProtein: "",
  maxCarbs: "",
  maxFat: "",
  category: "",
};

type NutritionExplorerProps = {
  items: NutritionProduct[];
  variant?: NutritionVariant;
  showRestaurant?: boolean;
};

export function NutritionExplorer({
  items,
  variant = "all",
  showRestaurant = false,
}: NutritionExplorerProps) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const [filters, setFilters] = useState<NutritionFiltersState>({
    ...emptyFilters,
    search: initialSearch,
  });
  const [sort, setSort] = useState<NutritionSortOption>(nutritionVariantConfig[variant].defaultSort);
  const deferredSearch = useDeferredValue(filters.search);

  const visibleItems = useMemo(
    () =>
      filterAndSortNutritionItems({
        items,
        variant,
        filters: {
          ...filters,
          search: deferredSearch,
        },
        sort,
      }),
    [deferredSearch, filters, items, sort, variant],
  );

  const categories = useMemo(() => getRestaurantCategories(items), [items]);

  return (
    <section className="section">
      <article className="panel tool-form-card">
        <div className="section-head tool-form-head">
          <span className="meta-pill">{nutritionVariantConfig[variant].label}</span>
          <h2>Filter and sort menu items.</h2>
          <p>Sort by calories, protein, carbs, fat, or protein-per-calorie and narrow the list to what fits your goal.</p>
        </div>

        <div className="nutrition-toolbar">
          <NutritionFilters categories={categories} filters={filters} onChange={setFilters} />
          <NutritionSort value={sort} onChange={setSort} />
        </div>

        <div className="nutrition-results-head">
          <strong>{visibleItems.length} items</strong>
          <span>{items.length} total in this view</span>
        </div>

        {visibleItems.length ? (
          <>
            <div className="nutrition-desktop-view">
              <NutritionTable items={visibleItems} showRestaurant={showRestaurant} />
            </div>
            <div className="nutrition-mobile-view">
              <div className="nutrition-card-grid">
                {visibleItems.map((item) => (
                  <NutritionItemCard key={item.id} item={item} showRestaurant={showRestaurant} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="tool-warning">
            No items matched the current filters. Adjust the search or macro filters and try again.
          </div>
        )}
      </article>
    </section>
  );
}
