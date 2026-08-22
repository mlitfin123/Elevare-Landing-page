import Image from "next/image";
import { TrackedLink } from "@/components/TrackedLink";
import { getMarketplaceCategories } from "@/lib/marketplace";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Elevare Marketplace",
  description:
    "Elevare is the marketplace on ElevareFit for finding the right health, fitness, or wellness support.",
  pathname: "/elevare",
});

export default async function ElevarePage() {
  const categories = (await getMarketplaceCategories()).slice(0, 8);

  return (
    <div className="container">
      <section className="hero product-hero">
        <div className="product-hero-copy">
          <div className="eyebrow">Elevare</div>
          <h1>Find the right support for your goals.</h1>
          <p>
            Elevare is the marketplace layer inside ElevareFit for browsing published profiles, saving the people
            you want to compare, and sending lightweight consultation requests when the fit looks right.
          </p>
          <div className="button-row">
            <TrackedLink
              className="button button-primary"
              href="/professionals/"
              eventName="cta_click"
              eventParams={{
                cta_name: "Find your match",
                cta_context: "elevare_hero",
                product: "Elevare",
              }}
            >
              Find your match
            </TrackedLink>
            <TrackedLink
              className="button button-secondary"
              href="/account/professional-profile/"
              eventName="cta_click"
              eventParams={{
                cta_name: "Join as a Pro",
                cta_context: "elevare_hero",
                product: "Elevare",
              }}
            >
              Join as a Pro
            </TrackedLink>
          </div>
        </div>

        <div className="product-hero-visual">
          <div className="product-hero-logo-frame product-hero-logo-frame-wordmark">
            <Image
              src="/elevare-wordmark.png"
              alt="Elevare professional marketplace logo"
              width={1086}
              height={362}
              sizes="(max-width: 720px) 240px, 360px"
              className="product-hero-logo"
              priority
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid-3">
          <article className="panel">
            <span className="stat-label">For clients</span>
            <h3>Browse first, create an account only when you need it.</h3>
            <p>Compare category, specialty, location, service mode, and pricing context before reaching out.</p>
          </article>

          <article className="panel">
            <span className="stat-label">For pros</span>
            <h3>Create a public listing that explains your work clearly.</h3>
            <p>Build your profile, add services and credentials, and submit it for approval when you are ready.</p>
          </article>

          <article className="panel">
            <span className="stat-label">How it works</span>
            <h3>Discover, compare, and connect.</h3>
            <p>Browse published profiles, save promising options, and send consultation requests when the fit looks right.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">Categories</div>
          <h2 className="section-title">Browse the marketplace by type of support.</h2>
          <p className="section-copy">
            The category system is built to support personal training, coaching, nutrition, wellness, mobility,
            performance, and other related services without boxing everything into one narrow label.
          </p>
        </div>

        <div className="professional-category-grid">
          {categories.map((category) => (
            <TrackedLink
              key={category.slug}
              className="proof-card proof-card-link"
              href={`/professionals/${category.slug}`}
              eventName="professional_category_selected"
              eventParams={{
                source_page: "elevare_overview",
                category: category.slug,
              }}
            >
              <span className="proof-label">{category.label}</span>
              <div className="proof-value">{category.headline}</div>
              <p className="proof-copy">{category.shortDescription}</p>
              <span className="proof-action">Browse category</span>
            </TrackedLink>
          ))}
        </div>
      </section>
    </div>
  );
}
