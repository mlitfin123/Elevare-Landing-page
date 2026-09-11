import { Suspense } from "react";
import { MarketplaceDirectory } from "@/components/marketplace/MarketplaceDirectory";
import { StructuredData } from "@/components/StructuredData";
import {
  getMarketplaceCategories,
  getMarketplaceProfessionals,
} from "@/lib/marketplace";
import {
  buildDirectorySchema,
  findTopCategories,
  getMarketplaceRotationSeed,
  toProfessionalDirectoryRecords,
} from "@/lib/marketplace-helpers";
import { hasMarketplaceFilterSearchParams } from "@/lib/marketplace-seo";
import { buildMetadata, siteConfig } from "@/lib/site";

type ProfessionalsDirectoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: ProfessionalsDirectoryPageProps) {
  const filtered = hasMarketplaceFilterSearchParams(await searchParams);

  return buildMetadata({
    title: "Find Trainers, Coaches & Wellness Experts | Elevare",
    description:
      "Explore personal trainers, nutrition coaches, bodybuilding coaches, wellness specialists, and other fitness and health-focused services on Elevare.",
    pathname: "/professionals",
    robots: filtered ? { index: false, follow: true } : undefined,
  });
}

export default async function ProfessionalsDirectoryPage() {
  const [categories, professionals] = await Promise.all([
    getMarketplaceCategories(),
    getMarketplaceProfessionals(),
  ]);
  const topCategories = findTopCategories(categories, professionals, 8);
  const structuredData = buildDirectorySchema(categories, professionals, siteConfig.url);
  const directoryProfessionals = toProfessionalDirectoryRecords(professionals);

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <Suspense fallback={null}>
        <MarketplaceDirectory
          categories={categories}
          professionals={directoryProfessionals}
          sourcePage="professionals_index"
          topCategories={topCategories}
          rotationSeed={getMarketplaceRotationSeed("professionals-index")}
          showMobileAppSection
        />
      </Suspense>
    </div>
  );
}
