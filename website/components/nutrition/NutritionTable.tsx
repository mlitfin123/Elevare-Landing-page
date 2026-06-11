import { MacroBadge } from "@/components/nutrition/MacroBadge";
import {
  getNutritionTags,
  getProteinPerCalorie,
  getServingLabel,
  type NutritionProduct,
} from "@/lib/nutrition-data";

type NutritionTableProps = {
  items: NutritionProduct[];
  showRestaurant?: boolean;
};

function formatCell(value: number | null, suffix = "") {
  return value == null ? "-" : `${value}${suffix}`;
}

export function NutritionTable({ items, showRestaurant = false }: NutritionTableProps) {
  return (
    <div className="nutrition-table-wrap">
      <table className="nutrition-table">
        <thead>
          <tr>
            {showRestaurant ? <th>Restaurant</th> : null}
            <th>Item</th>
            <th>Serving size</th>
            <th>Calories</th>
            <th>Protein</th>
            <th>Carbs</th>
            <th>Fat</th>
            <th>Protein / Cal</th>
            <th>Tags</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const tags = getNutritionTags(item);

            return (
              <tr key={item.id}>
                {showRestaurant ? <td>{item.restaurantName}</td> : null}
                <td>
                  <strong>{item.productName}</strong>
                  {item.category ? <div className="nutrition-table-sub">{item.category}</div> : null}
                </td>
                <td>{getServingLabel(item)}</td>
                <td>{formatCell(item.calories)}</td>
                <td>{formatCell(item.proteinG, "g")}</td>
                <td>{formatCell(item.carbsG, "g")}</td>
                <td>{formatCell(item.fatG, "g")}</td>
                <td>{getProteinPerCalorie(item).toFixed(3)}</td>
                <td>
                  <div className="nutrition-chip-row">
                    {tags.map((tag) => (
                      <MacroBadge key={tag} tag={tag} />
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
