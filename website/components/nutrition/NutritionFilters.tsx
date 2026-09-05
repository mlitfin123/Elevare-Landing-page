import type { NutritionFiltersState } from "@/lib/nutrition-data";
import { localizeNutritionText } from "@/lib/i18n/catalog-content";
import type { Locale } from "@/lib/i18n/config";
import { getCatalogMessages } from "@/lib/i18n/catalog-messages";

type NutritionFiltersProps = {
  categories: string[];
  filters: NutritionFiltersState;
  onChange: (filters: NutritionFiltersState) => void;
  locale?: Locale;
};

export function NutritionFilters({ categories, filters, onChange, locale = "en" }: NutritionFiltersProps) {
  const messages = getCatalogMessages(locale).nutrition.explorer;

  return (
    <div className="tool-form-grid nutrition-filter-grid">
      <label className="field">
        <span className="field-label">{messages.searchLabel}</span>
        <input
          type="text"
          value={filters.search}
          placeholder={messages.searchPlaceholder}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-label">{messages.category}</span>
        <select
          value={filters.category}
          onChange={(event) => onChange({ ...filters, category: event.target.value })}
        >
          <option value="">{messages.allCategories}</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {localizeNutritionText(category, locale)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">{messages.maxCalories}</span>
        <input
          type="number"
          min="0"
          step="1"
          value={filters.maxCalories}
          placeholder="500"
          onChange={(event) => onChange({ ...filters, maxCalories: event.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-label">{messages.minProtein}</span>
        <input
          type="number"
          min="0"
          step="1"
          value={filters.minProtein}
          placeholder="25"
          onChange={(event) => onChange({ ...filters, minProtein: event.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-label">{messages.maxCarbs}</span>
        <input
          type="number"
          min="0"
          step="1"
          value={filters.maxCarbs}
          placeholder="20"
          onChange={(event) => onChange({ ...filters, maxCarbs: event.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-label">{messages.maxFat}</span>
        <input
          type="number"
          min="0"
          step="1"
          value={filters.maxFat}
          placeholder="10"
          onChange={(event) => onChange({ ...filters, maxFat: event.target.value })}
        />
      </label>
      <label className="nutrition-toggle">
        <input
          type="checkbox"
          checked={filters.hideExtras}
          onChange={(event) => onChange({ ...filters, hideExtras: event.target.checked })}
        />
        <span>{messages.hideExtras}</span>
      </label>
    </div>
  );
}
