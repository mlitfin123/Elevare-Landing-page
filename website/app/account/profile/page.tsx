import { ClientProfileEditor } from "@/components/marketplace/ClientProfileEditor";
import { getMarketplaceCategories } from "@/lib/marketplace";

export default async function AccountClientProfilePage() {
  return <ClientProfileEditor categories={await getMarketplaceCategories()} />;
}
