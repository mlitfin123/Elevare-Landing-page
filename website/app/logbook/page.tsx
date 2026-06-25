import { Callout } from "@/components/Callout";
import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { TrackedLink } from "@/components/TrackedLink";
import { buildMetadata, productConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Logbook",
  description:
    "Logbook is the fitness tracking app in the Elevare ecosystem, built for clean training visibility.",
  pathname: "/logbook",
});

export default function LogbookPage() {
  const logbook = productConfig.Logbook;

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Logbook</div>
        <h1>Track workouts without turning tracking into another job.</h1>
        <p>
          Logbook is the tracking layer of the Elevare ecosystem, built to make training simpler to record,
          easier to review, and more consistent over time.
        </p>
        <div className="button-row">
          <ProductCtaButtons product="Logbook" context="logbook_hero" />
          <TrackedLink
            className="button button-secondary"
            href="/blog"
            eventName="cta_click"
            eventParams={{
              cta_name: "Read insights",
              cta_context: "logbook_hero",
              product: "Logbook",
            }}
          >
            Read insights
          </TrackedLink>
        </div>
      </section>

      <section className="section">
        <div className="grid-3">
          <article className="panel">
            <span className="stat-label">Role</span>
            <h3>Daily training visibility</h3>
            <p>Built for workout logging, habit review, and more consistent training decisions.</p>
          </article>

          <article className="panel">
            <span className="stat-label">Ideal user</span>
            <h3>People who train regularly</h3>
            <p>Lifters, athletes, and high-consistency users who want cleaner data on what they actually do.</p>
          </article>

          <article className="panel">
            <span className="stat-label">Status</span>
            <h3>{logbook.status}</h3>
            <p>Available now on the App Store and Google Play as part of the wider Elevare product ecosystem.</p>
          </article>
        </div>
      </section>

      <Callout title="Where Logbook fits">
        <p>
          Logbook is about the day-to-day habit of training. It focuses on capturing the work itself so the rest
          of the ecosystem can build on real behavior rather than vague intent.
        </p>
        <div className="hero-actions">
          <TrackedLink
            className="button button-secondary"
            href="/exercises"
            eventName="cta_click"
            eventParams={{
              cta_name: "Browse exercises",
              cta_context: "logbook_callout",
              product: "Logbook",
            }}
          >
            Browse exercises
          </TrackedLink>
          <TrackedLink
            className="button button-secondary"
            href="/workouts"
            eventName="cta_click"
            eventParams={{
              cta_name: "Browse workout templates",
              cta_context: "logbook_callout",
              product: "Logbook",
            }}
          >
            Browse workout templates
          </TrackedLink>
        </div>
      </Callout>
    </div>
  );
}
