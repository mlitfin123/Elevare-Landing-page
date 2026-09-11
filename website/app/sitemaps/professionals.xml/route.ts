import { getMarketplaceSnapshot } from "@/lib/marketplace";
import { buildMarketplaceEntries } from "@/scripts/generate-sitemaps";

const xml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
export async function GET() {
  const entries = buildMarketplaceEntries(await getMarketplaceSnapshot());
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => `<url><loc>${xml(entry.url)}</loc>${entry.lastModified ? `<lastmod>${xml(entry.lastModified)}</lastmod>` : ""}</url>`).join("")}</urlset>`, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "no-store" },
  });
}
