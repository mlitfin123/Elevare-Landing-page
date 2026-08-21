import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { TrackedLink } from "@/components/TrackedLink";
import { buildMetadata, productConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Apps",
  description:
    "Explore the ElevareFit apps and marketplace for tracking, competition prep, and finding the right support.",
  pathname: "/apps",
});

const productCards = [
  {
    key: "Logbook" as const,
    description:
      "Record workouts, food, macros, bodyweight, and progress in a daily fitness log.",
  },
  {
    key: "StageLab" as const,
    description:
      "Track contest-prep timelines, weekly check-ins, progress photos, and plan recommendations.",
  },
  {
    key: "Elevare" as const,
    description:
      "Compare fitness and wellness professionals by specialty, location, service mode, pricing, and credentials.",
  },
];

export default function AppsPage() {
  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Apps</div>
        <h1>Apps built for tracking, prep, and coaching support.</h1>
        <p>
          Use Logbook for daily tracking, StageLab for physique competition prep, and Elevare to find professional
          support.
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
          <h2>Choose the product that fits what you need.</h2>
          <p>
            Each product covers a specific part of training, contest prep, or professional support.
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
