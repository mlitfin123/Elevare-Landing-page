import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { TrackedLink } from "@/components/TrackedLink";
import { buildMetadata, productConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Apps",
  description:
    "Explore the ElevareFit apps for tracking, competition prep, and coming-soon coaching support.",
  pathname: "/apps",
});

const productCards = [
  {
    key: "Logbook" as const,
    description:
      "A focused fitness tracking app built to make workouts easier to record, review, and repeat with consistency.",
  },
  {
    key: "StageLab" as const,
    description:
      "A competition prep app for structuring performance phases, tightening feedback loops, and organizing prep work with more discipline.",
  },
  {
    key: "Elevare" as const,
    description:
      "A coaching marketplace built to help members find the right coach and help coaches get discovered by the right people.",
  },
];

export default function AppsPage() {
  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Apps</div>
        <h1>Apps built for tracking, prep, and coaching support.</h1>
        <p>
          Explore the ElevareFit app lineup across day-to-day training, competition prep, and the coming-soon
          marketplace layer for finding the right coach.
        </p>
        <div className="button-row">
          <TrackedLink
            className="button button-primary"
            href="/calculators"
            eventName="cta_click"
            eventParams={{
              cta_name: "Explore free tools",
              cta_context: "apps_hero",
            }}
          >
            Explore free tools
          </TrackedLink>
          <TrackedLink
            className="button button-secondary"
            href="/blog"
            eventName="cta_click"
            eventParams={{
              cta_name: "Read the blog",
              cta_context: "apps_hero",
            }}
          >
            Read the blog
          </TrackedLink>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">Directory</div>
          <h2>Three products, clearly positioned.</h2>
          <p>
            Each product solves a different part of the same performance problem set, and the whole system is
            meant to feel connected instead of scattered.
          </p>
        </div>

        <div className="grid-3">
          {productCards.map((card) => {
            const product = productConfig[card.key];

            return (
              <article key={card.key} className="panel">
                <span className="stat-label">{product.status}</span>
                <h3>{product.title}</h3>
                <p>{card.description}</p>
                <ul>
                  <li>
                    <strong>Ideal user:</strong> {product.idealUser}
                  </li>
                  <li>
                    <strong>Status:</strong> {product.status}
                  </li>
                </ul>
                <div className="button-row">
                  <TrackedLink
                    className="button button-secondary"
                    href={`/${product.slug}`}
                    eventName="cta_click"
                    eventParams={{
                      cta_name: "View product page",
                      cta_context: "apps_directory_card",
                      product: product.title,
                    }}
                  >
                    View product page
                  </TrackedLink>
                  <ProductCtaButtons product={card.key} context="apps_directory_card" />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
