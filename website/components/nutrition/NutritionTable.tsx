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

type NutritionTableProps = {
  items: NutritionProduct[];
  showRestaurant?: boolean;
  locale?: Locale;
};

function formatCell(value: number | null, suffix = "") {
  return value == null ? "-" : `${value}${suffix}`;
}

export function NutritionTable({ items, showRestaurant = false, locale = "en" }: NutritionTableProps) {
  const messages = getCatalogMessages(locale).nutrition.explorer;

  return (
    <div className="nutrition-table-wrap">
      <table className="nutrition-table">
        <thead>
          <tr>
            {showRestaurant ? <th>{messages.restaurant}</th> : null}
            <th>{messages.item}</th>
            <th>{messages.serving}</th>
            <th>{messages.calories}</th>
            <th>{messages.protein}</th>
            <th>{messages.carbs}</th>
            <th>{messages.fat}</th>
            <th>{messages.proteinPerCalorie}</th>
            <th>{messages.tags}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const tags = getNutritionTags(item);
            const displayItem = localizeNutritionProduct(item, locale);

            return (
              <tr key={item.id}>
                {showRestaurant ? <td>{displayItem.restaurantName}</td> : null}
                <td>
                  <strong>{displayItem.productName}</strong>
                  {displayItem.category ? <div className="nutrition-table-sub">{displayItem.category}</div> : null}
                </td>
                <td>{getServingLabel(displayItem)}</td>
                <td>{formatCell(item.calories)}</td>
                <td>{formatCell(item.proteinG, "g")}</td>
                <td>{formatCell(item.carbsG, "g")}</td>
                <td>{formatCell(item.fatG, "g")}</td>
                <td>{getProteinPerCalorie(item).toFixed(3)}</td>
                <td>
                  <div className="nutrition-chip-row">
                    {tags.map((tag) => (
                      <MacroBadge key={tag} tag={tag} label={messages.tagLabels[tag]} />
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
