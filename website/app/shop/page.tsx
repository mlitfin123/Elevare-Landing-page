import { StageAnalysisProducts } from "@/components/stage-analysis/StageAnalysisProducts";
import Image from "next/image";
import { ShopCheckout } from "@/components/shop/ShopCheckout";
import { getShopInventorySnapshot } from "@/lib/shop-inventory";
import {
  getPublicShopProducts,
  resolveShopPublicAvailability,
} from "@/lib/shop-products";
import { buildMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Shop",
  description: "Explore one-time StageLab AI analyses and ElevareFit physical products. The Show Day Kit is coming soon.",
  pathname: "/shop",
});

export default async function ShopPage() {
  const products = getPublicShopProducts();
  const productCards = await Promise.all(products.map(async (product) => {
    if (product.status !== "active") {
      return { product, availability: resolveShopPublicAvailability(product, false) };
    }
    try {
      const inventory = await getShopInventorySnapshot(product.id);
      const canSell = Boolean(
        inventory
        && inventory.availableToSell > 0
        && inventory.backordersEnabled === false
        && inventory.stripePriceId === product.stripePriceId,
      );
      return { product, availability: resolveShopPublicAvailability(product, canSell) };
    } catch {
      return { product, availability: resolveShopPublicAvailability(product, false) };
    }
  }));

  return (
    <div className="container">
      <section className="hero shop-hero">
        <div className="eyebrow">Shop</div>
        <h1>ElevareFit Shop</h1>
        <p>Digital analyses for your next checkpoint. Physical essentials for show day.</p>
      </section>

      <StageAnalysisProducts source="shop-digital" />

      <section className="section" id="physical-products" aria-labelledby="shop-products-title">
        <div className="section-head">
          <div className="eyebrow">Physical products</div>
          <h2 id="shop-products-title">Show-day essentials</h2>
        </div>

        <div className="shop-product-grid">
          {productCards.map(({ product, availability }) => (
            <article className={`panel shop-product-card${product.image ? "" : " shop-product-text-only"}`} key={product.id}>
              {product.image ? <div className="shop-product-media">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 720px) 100vw, 42vw"
                  />
              </div> : null}
              <div className="shop-product-copy">
                <span className="stat-label">
                  {availability === "coming_soon"
                    ? "Coming Soon"
                    : availability === "restocking"
                      ? "Restocking Soon"
                      : "Available"}
                </span>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                {availability === "coming_soon" ? null : availability === "restocking" ? (
                  <p className="shop-availability-note">This product is temporarily unavailable.</p>
                ) : (
                  <ShopCheckout productId={product.id} />
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
