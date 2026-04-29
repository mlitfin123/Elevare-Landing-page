import Link from "next/link";
import { buildMetadata, productConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Apps",
  description:
    "Explore Logbook, StageLab, and Elevare as one connected fitness performance ecosystem.",
  pathname: "/apps",
});

const productCards = [
  {
    key: "Logbook" as const,
    ctaLabel: "Download on the App Store",
    ctaHref: productConfig.Logbook.ctaHref,
    description:
      "A focused fitness tracking app built to make workouts easier to record, review, and repeat with consistency.",
  },
  {
    key: "StageLab" as const,
    ctaLabel: "Learn more",
    ctaHref: "/stagelab",
    description:
      "A competition prep app for structuring performance phases, tightening feedback loops, and organizing prep work with more discipline.",
  },
  {
    key: "Elevare" as const,
    ctaLabel: "Learn more",
    ctaHref: "/elevare",
    description:
      "A coaching marketplace built to help members find the right coach and help coaches get discovered by the right people.",
  },
];

export default function AppsPage() {
  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Apps</div>
        <h1>One ecosystem for tracking, prep, and coaching.</h1>
        <p>
          Elevare Fit LLC is building a connected set of products across the day-to-day habit of training,
          the structure of competition prep, and the marketplace layer that helps people find the right
          coaching support.
        </p>
        <div className="button-row">
          <Link className="button button-primary" href="/blog">
            Read insights
          </Link>
          <Link className="button button-secondary" href="/elevare">
            Explore Elevare
          </Link>
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
            const buttonClassName =
              card.key === "Logbook" ? "button button-store" : "button button-primary";

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
                  <Link className={buttonClassName} href={card.ctaHref}>
                    {card.ctaLabel}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
