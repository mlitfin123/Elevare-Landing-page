import { MacroBadge } from "@/components/nutrition/MacroBadge";
import {
  getNutritionTags,
  getProteinPerCalorie,
  getServingLabel,
  type NutritionProduct,
} from "@/lib/nutrition-data";

type NutritionItemCardProps = {
  item: NutritionProduct;
  showRestaurant?: boolean;
};

function formatMacro(value: number | null, suffix: string) {
  return value == null ? "-" : `${value}${suffix}`;
}

export function NutritionItemCard({ item, showRestaurant = false }: NutritionItemCardProps) {
  const tags = getNutritionTags(item);
  const proteinPerCalorie = getProteinPerCalorie(item);

  return (
    <article className="panel nutrition-item-card">
      <div className="nutrition-item-card-head">
        {showRestaurant ? <span className="meta-pill">{item.restaurantName}</span> : null}
        {item.category ? <span className="meta-pill">{item.category}</span> : null}
      </div>
      <h3>{item.productName}</h3>
      <p>{getServingLabel(item)}</p>
      <div className="nutrition-macro-grid">
        <div className="nutrition-macro-cell">
          <span>Calories</span>
          <strong>{formatMacro(item.calories, "")}</strong>
        </div>
        <div className="nutrition-macro-cell">
          <span>Protein</span>
          <strong>{formatMacro(item.proteinG, "g")}</strong>
        </div>
        <div className="nutrition-macro-cell">
          <span>Carbs</span>
          <strong>{formatMacro(item.carbsG, "g")}</strong>
        </div>
        <div className="nutrition-macro-cell">
          <span>Fat</span>
          <strong>{formatMacro(item.fatG, "g")}</strong>
        </div>
      </div>
      <div className="nutrition-secondary-meta">
        <span>Protein per calorie: {proteinPerCalorie.toFixed(3)}</span>
      </div>
      {tags.length ? (
        <div className="nutrition-chip-row">
          {tags.map((tag) => (
            <MacroBadge key={tag} tag={tag} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
