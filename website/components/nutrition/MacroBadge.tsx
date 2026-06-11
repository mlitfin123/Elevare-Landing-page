import type { NutritionTag } from "@/lib/nutrition-data";

type MacroBadgeProps = {
  tag: NutritionTag;
};

export function MacroBadge({ tag }: MacroBadgeProps) {
  return <span className="macro-badge">{tag}</span>;
}
