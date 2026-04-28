import Link from "next/link";
import { Callout } from "@/components/Callout";
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
          <Link className="button button-primary" href={productConfig.Logbook.ctaHref}>
            Download on the App Store
          </Link>
          <Link className="button button-secondary" href="/blog">
            Visit the blog
          </Link>
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
