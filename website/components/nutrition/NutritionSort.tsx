import type { NutritionSortOption } from "@/lib/nutrition-data";
import { nutritionSortOptions } from "@/lib/nutrition-data";
import type { Locale } from "@/lib/i18n/config";
import { getCatalogMessages } from "@/lib/i18n/catalog-messages";

type NutritionSortProps = {
  value: NutritionSortOption;
  onChange: (value: NutritionSortOption) => void;
  locale?: Locale;
};

export function NutritionSort({ value, onChange, locale = "en" }: NutritionSortProps) {
  const messages = getCatalogMessages(locale).nutrition.explorer;

  return (
    <label className="field nutrition-sort-field">
      <span className="field-label">{messages.sort}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as NutritionSortOption)}>
        {nutritionSortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {messages.sortOptions[option.value] ?? option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
