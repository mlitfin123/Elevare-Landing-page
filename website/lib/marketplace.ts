import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { MARKETPLACE_CATEGORY_SEEDS } from "@/lib/marketplace-categories";
import {
  EMPTY_MARKETPLACE_SNAPSHOT,
  type MarketplaceSnapshot,
  type ProfessionalCategoryRecord,
  type ProfessionalProfileRecord,
} from "@/lib/marketplace-types";

const generatedDataPath = path.join(process.cwd(), ".generated", "marketplace-data.json");

function readMarketplaceSnapshotFile(): MarketplaceSnapshot {
  if (!fs.existsSync(generatedDataPath)) {
    return {
      ...EMPTY_MARKETPLACE_SNAPSHOT,
      categories: MARKETPLACE_CATEGORY_SEEDS.map((category) => ({
        id: category.stableId,
        stableId: category.stableId,
        slug: category.slug,
        publicSlug: category.publicSlug,
        label: category.label,
        headline: category.headline,
        shortDescription: category.shortDescription,
        sortOrder: category.sortOrder,
        isActive: true,
      })),
    };
  }

  return JSON.parse(fs.readFileSync(generatedDataPath, "utf8")) as MarketplaceSnapshot;
}

export const getMarketplaceSnapshot = cache(async () => {
  return readMarketplaceSnapshotFile();
});

export const getMarketplaceCategories = cache(async (): Promise<ProfessionalCategoryRecord[]> => {
  const snapshot = await getMarketplaceSnapshot();
  return [...snapshot.categories].sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
});

export const getMarketplaceProfessionals = cache(async (): Promise<ProfessionalProfileRecord[]> => {
  const snapshot = await getMarketplaceSnapshot();
  return [...snapshot.professionals];
});

export async function getMarketplaceCategoryBySlug(slug: string) {
  const categories = await getMarketplaceCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}

export async function getMarketplaceProfessionalBySlug(slug: string) {
  const professionals = await getMarketplaceProfessionals();
  return professionals.find((professional) => professional.profileSlug === slug) ?? null;
}
