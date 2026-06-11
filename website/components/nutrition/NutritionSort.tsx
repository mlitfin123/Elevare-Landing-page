import type { NutritionSortOption } from "@/lib/nutrition-data";
import { nutritionSortOptions } from "@/lib/nutrition-data";

type NutritionSortProps = {
  value: NutritionSortOption;
  onChange: (value: NutritionSortOption) => void;
};

export function NutritionSort({ value, onChange }: NutritionSortProps) {
  return (
    <label className="field nutrition-sort-field">
      <span className="field-label">Sort</span>
      <select value={value} onChange={(event) => onChange(event.target.value as NutritionSortOption)}>
        {nutritionSortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
