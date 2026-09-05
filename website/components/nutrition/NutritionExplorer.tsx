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
import { localizeNutritionProduct } from "@/lib/i18n/catalog-content";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/config";
import { getCatalogMessages } from "@/lib/i18n/catalog-messages";

const emptyFilters: NutritionFiltersState = {
  search: "",
  maxCalories: "",
  minProtein: "",
  maxCarbs: "",
  maxFat: "",
  category: "",
  hideExtras: true,
};

type NutritionExplorerProps = {
  items: NutritionProduct[];
  variant?: NutritionVariant;
  showRestaurant?: boolean;
  locale?: Locale;
};

export function NutritionExplorer({
  items,
  variant = "all",
  showRestaurant = false,
  locale = "en",
}: NutritionExplorerProps) {
  const messages = getCatalogMessages(locale).nutrition.explorer;
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const [filters, setFilters] = useState<NutritionFiltersState>({
    ...emptyFilters,
    search: initialSearch,
  });
  const [sort, setSort] = useState<NutritionSortOption>(nutritionVariantConfig[variant].defaultSort);
  const deferredSearch = useDeferredValue(filters.search);

  const visibleItems = useMemo(() => {
      const normalizedSearch = deferredSearch.trim().toLocaleLowerCase(locale);
      const filtered = filterAndSortNutritionItems({
        items,
        variant,
        filters: {
          ...filters,
          search: "",
        },
        sort,
      });

      if (!normalizedSearch) return filtered;

      return filtered.filter((item) => {
        const displayItem = localizeNutritionProduct(item, locale);
        return [item.productName, item.restaurantName, item.category, displayItem.productName, displayItem.category]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase(locale).includes(normalizedSearch));
      });
    }, [deferredSearch, filters, items, locale, sort, variant]);

  const categories = useMemo(() => getRestaurantCategories(items), [items]);

  return (
    <section className="section">
      <article className="panel tool-form-card">
        <div className="section-head tool-form-head">
          <span className="meta-pill">{messages.variants[variant] ?? nutritionVariantConfig[variant].label}</span>
          <h2>{messages.title}</h2>
          <p>{messages.copy}</p>
        </div>

        <div className="nutrition-toolbar">
          <NutritionFilters categories={categories} filters={filters} onChange={setFilters} locale={locale} />
          <NutritionSort value={sort} onChange={setSort} locale={locale} />
        </div>

        <div className="nutrition-results-head">
          <strong>{formatNumber(visibleItems.length, locale)} {visibleItems.length === 1 ? messages.itemSingular : messages.itemPlural}</strong>
          <span>{messages.total.replace("{count}", formatNumber(items.length, locale))}</span>
        </div>

        {visibleItems.length ? (
          <>
            <div className="nutrition-desktop-view">
              <NutritionTable items={visibleItems} showRestaurant={showRestaurant} locale={locale} />
            </div>
            <div className="nutrition-mobile-view">
              <div className="nutrition-card-grid">
                {visibleItems.map((item) => (
                  <NutritionItemCard key={item.id} item={item} showRestaurant={showRestaurant} locale={locale} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="tool-warning">{messages.empty}</div>
        )}
      </article>
    </section>
  );
}
