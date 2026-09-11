import { getMarketplaceSnapshot } from "@/lib/marketplace";
// Browser/CDN caches must not hide on-demand invalidation of the server cache.
export async function GET() {
  return Response.json(await getMarketplaceSnapshot(), { headers: { "cache-control": "no-store" } });
}
