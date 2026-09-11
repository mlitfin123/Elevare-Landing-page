import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { MARKETPLACE_CATEGORY_SEEDS } from "./marketplace-categories.ts";
import { getMarketplaceServerClient } from "./marketplace-server.ts";
import { professionalCache, professionalIdPattern, publicSlugPattern } from "./professional-cache.ts";
import { mapPublicMarketplaceRows, type MarketplacePublicTrainerRow, type MarketplaceInternationalTrainerRow, type MarketplacePublicTrustRow } from "./marketplace-public-mapper.ts";
import type { ProfessionalCategoryRecord, ProfessionalProfileRecord } from "./marketplace-types.ts";

type PublicRow = { professional_id: string; slug: string; profile: MarketplacePublicTrainerRow; international: MarketplaceInternationalTrainerRow; trust: MarketplacePublicTrustRow };

export const getMarketplaceCategories = cache(async (): Promise<ProfessionalCategoryRecord[]> =>
  MARKETPLACE_CATEGORY_SEEDS.map((category) => ({ ...category, id: category.stableId, isActive: true })),
);

async function readProfessionals(slug?: string): Promise<ProfessionalProfileRecord[]> {
  const client = getMarketplaceServerClient();
  const rows: PublicRow[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = client.from("marketplace_public_professionals_v3")
      .select("professional_id,slug,profile,international,trust")
      .order("professional_id").range(offset, offset + 499);
    if (slug) query = query.eq("slug", slug);
    const { data, error } = await query;
    if (error) throw new Error("MARKETPLACE_PUBLIC_READ_FAILED");
    rows.push(...data as PublicRow[]);
    if (data.length < 500 || slug) break;
  }
  // Mandatory restricted projection: no static or legacy trust fallback.
  return mapPublicMarketplaceRows([], rows.map((row) => row.profile), rows.map((row) => row.international), rows.map((row) => row.trust)).professionals;
}

const getPublicVersion = cache(async (slug: string | null) => {
  // Opt only these data-dependent renders into runtime before Supabase can
  // catch Next.js's prerender interruption as if it were a network error.
  await connection();
  const { data, error } = await getMarketplaceServerClient().rpc("marketplace_publication_version", { p_slug: slug });
  if (error || typeof data !== "string") throw new Error("MARKETPLACE_VERSION_READ_FAILED");
  return data;
});

export const getMarketplaceProfessionals = cache(async () => {
  const version = await getPublicVersion(null);
  return unstable_cache(() => readProfessionals(), ["public-professionals-v3", version],
    { tags: [professionalCache.collection, professionalCache.homepage, professionalCache.sitemap], revalidate: 3600 })();
});

export const getMarketplaceProfessionalBySlug = cache(async (slug: string) => {
  if (slug.length > 160 || !publicSlugPattern.test(slug)) return null;
  const version = await getPublicVersion(slug);
  const stableId = version.split(":")[0];
  return unstable_cache(async () => (await readProfessionals(slug))[0] ?? null,
    ["public-professional-v3", slug, version], {
      tags: [professionalCache.slug(slug), ...(professionalIdPattern.test(stableId) ? [professionalCache.id(stableId)] : [])], revalidate: 3600,
    })();
});

export const getMarketplaceSnapshot = cache(async () => ({
  generatedAt: null, categories: await getMarketplaceCategories(), professionals: await getMarketplaceProfessionals(),
}));

export async function getMarketplaceCategoryBySlug(slug: string) {
  return (await getMarketplaceCategories()).find((category) => category.slug === slug) ?? null;
}

export const getMarketplaceCanonicalSlug = cache(async (slug: string): Promise<string | null> => {
  if (slug.length > 160 || !publicSlugPattern.test(slug)) return null;
  const { data, error } = await getMarketplaceServerClient().rpc("marketplace_resolve_public_slug", { p_slug: slug });
  if (error) throw new Error("MARKETPLACE_SLUG_LOOKUP_FAILED");
  return typeof data === "string" && publicSlugPattern.test(data) && data !== slug ? data : null;
});
