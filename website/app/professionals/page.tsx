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
} from "@/lib/marketplace-helpers";
import { buildMetadata, siteConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Find Trainers, Coaches, and Wellness Support",
  description:
    "Browse reviewed personal trainers, coaches, nutrition professionals, dietitians, and wellness specialists on Elevare.",
  pathname: "/professionals",
});

export default async function ProfessionalsDirectoryPage() {
  const [categories, professionals] = await Promise.all([
    getMarketplaceCategories(),
    getMarketplaceProfessionals(),
  ]);
  const topCategories = findTopCategories(categories, professionals, 8);
  const structuredData = buildDirectorySchema(categories, professionals, siteConfig.url);

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <Suspense fallback={null}>
        <MarketplaceDirectory
          categories={categories}
          professionals={professionals}
          sourcePage="professionals_index"
          topCategories={topCategories}
          showMobileAppSection
        />
      </Suspense>
    </div>
  );
}
