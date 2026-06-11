import type { NutritionFiltersState } from "@/lib/nutrition-data";

type NutritionFiltersProps = {
  categories: string[];
  filters: NutritionFiltersState;
  onChange: (filters: NutritionFiltersState) => void;
};

export function NutritionFilters({ categories, filters, onChange }: NutritionFiltersProps) {
  return (
    <div className="tool-form-grid nutrition-filter-grid">
      <label className="field">
        <span className="field-label">Search items</span>
        <input
          type="text"
          value={filters.search}
          placeholder="Search menu items"
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-label">Category</span>
        <select
          value={filters.category}
          onChange={(event) => onChange({ ...filters, category: event.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">Max calories</span>
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
        <span className="field-label">Min protein</span>
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
        <span className="field-label">Max carbs</span>
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
        <span className="field-label">Max fat</span>
        <input
          type="number"
          min="0"
          step="1"
          value={filters.maxFat}
          placeholder="10"
          onChange={(event) => onChange({ ...filters, maxFat: event.target.value })}
        />
      </label>
    </div>
  );
}
