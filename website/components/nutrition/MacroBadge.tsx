import type { NutritionTag } from "@/lib/nutrition-data";

type MacroBadgeProps = {
  tag: NutritionTag;
  label?: string;
};

export function MacroBadge({ tag, label }: MacroBadgeProps) {
  return <span className="macro-badge">{label ?? tag}</span>;
}
