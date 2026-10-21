import { MARKETPLACE_TAXONOMY_CATEGORIES, ARCHIVED_TAXONOMY } from "./marketplace-taxonomy.ts";
import { availableCategories, type CategoryCatalog } from "./category-specialties.ts";
import type { ProfessionalCategoryRecord } from "./marketplace-types.ts";

export function mapCategoryCatalog(catalog: CategoryCatalog): ProfessionalCategoryRecord[] {
  return availableCategories(catalog).map((category, index) => {
    const copy = ARCHIVED_TAXONOMY.find(entry => entry.stableId === category.slug);
    const slug = category.public_slug || copy?.publicSlug || category.slug.replaceAll('_', '-');
    return { id: category.id, stableId: category.slug, slug, publicSlug: slug, label: category.name,
      headline: copy?.headline ?? category.name, shortDescription: copy?.shortDescription ?? null,
      sortOrder: index, isActive: true, specialtyLabels: Object.fromEntries(category.options.map(option => [option.id, option.labels])) };
  });
}

export type MarketplaceCategorySeed = {
  stableId: string;
  slug: string;
  publicSlug: string;
  label: string;
  headline: string;
  shortDescription: string;
  sortOrder: number;
};

export const MARKETPLACE_CATEGORY_SEEDS: readonly MarketplaceCategorySeed[] = MARKETPLACE_TAXONOMY_CATEGORIES.map(
  (category) => ({
    stableId: category.stableId,
    slug: category.publicSlug,
    publicSlug: category.publicSlug,
    label: category.label,
    headline: category.headline,
    shortDescription: category.shortDescription,
    sortOrder: category.sortOrder,
  }),
);

export const RESERVED_MARKETPLACE_SLUGS = new Set(
  ARCHIVED_TAXONOMY.map((category) => category.publicSlug),
);
