import { MARKETPLACE_TAXONOMY_CATEGORIES } from "./marketplace-taxonomy.ts";

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
  MARKETPLACE_CATEGORY_SEEDS.map((category) => category.publicSlug),
);
