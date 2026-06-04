import { Callout } from "@/components/Callout";
import { TrackedLink } from "@/components/TrackedLink";
import { buildMetadata, productConfig } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Logbook",
  description:
    "Logbook is the fitness tracking app in the Elevare ecosystem, built for clean training visibility.",
  pathname: "/logbook",
});

export default function LogbookPage() {
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
          <TrackedLink
            className="button button-store"
            href={productConfig.Logbook.ctaHref}
            eventName="cta_click"
            eventParams={{
              cta_name: "Download on the App Store",
              cta_context: "logbook_hero",
              product: "Logbook",
            }}
          >
            Download on the App Store
          </TrackedLink>
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
            <h3>Live product</h3>
            <p>Available now as part of the wider Elevare product ecosystem.</p>
          </article>
        </div>
      </section>

      <Callout title="Where Logbook fits">
        <p>
          Logbook is about the day-to-day habit of training. It focuses on capturing the work itself so the rest
          of the ecosystem can build on real behavior rather than vague intent.
        </p>
      </Callout>
    </div>
  );
}
