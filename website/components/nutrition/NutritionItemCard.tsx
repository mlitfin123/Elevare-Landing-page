import { MacroBadge } from "@/components/nutrition/MacroBadge";
import {
  getNutritionTags,
  getProteinPerCalorie,
  getServingLabel,
  type NutritionProduct,
} from "@/lib/nutrition-data";
import { localizeNutritionProduct } from "@/lib/i18n/catalog-content";
import type { Locale } from "@/lib/i18n/config";
import { getCatalogMessages } from "@/lib/i18n/catalog-messages";

type NutritionItemCardProps = {
  item: NutritionProduct;
  showRestaurant?: boolean;
  locale?: Locale;
};

function formatMacro(value: number | null, suffix: string) {
  return value == null ? "-" : `${value}${suffix}`;
}

export function NutritionItemCard({ item, showRestaurant = false, locale = "en" }: NutritionItemCardProps) {
  const messages = getCatalogMessages(locale).nutrition.explorer;
  const displayItem = localizeNutritionProduct(item, locale);
  const tags = getNutritionTags(item);
  const proteinPerCalorie = getProteinPerCalorie(item);

  return (
    <article className="panel nutrition-item-card">
      <div className="nutrition-item-card-head">
        {showRestaurant ? <span className="meta-pill">{displayItem.restaurantName}</span> : null}
        {displayItem.category ? <span className="meta-pill">{displayItem.category}</span> : null}
      </div>
      <h3>{displayItem.productName}</h3>
      <p>{getServingLabel(displayItem)}</p>
      <div className="nutrition-macro-grid">
        <div className="nutrition-macro-cell">
          <span>{messages.calories}</span>
          <strong>{formatMacro(item.calories, "")}</strong>
        </div>
        <div className="nutrition-macro-cell">
          <span>{messages.protein}</span>
          <strong>{formatMacro(item.proteinG, "g")}</strong>
        </div>
        <div className="nutrition-macro-cell">
          <span>{messages.carbs}</span>
          <strong>{formatMacro(item.carbsG, "g")}</strong>
        </div>
        <div className="nutrition-macro-cell">
          <span>{messages.fat}</span>
          <strong>{formatMacro(item.fatG, "g")}</strong>
        </div>
      </div>
      <div className="nutrition-secondary-meta">
        <span>{messages.proteinPerCalorie}: {proteinPerCalorie.toFixed(3)}</span>
      </div>
      {tags.length ? (
        <div className="nutrition-chip-row">
          {tags.map((tag) => (
            <MacroBadge key={tag} tag={tag} label={messages.tagLabels[tag]} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
