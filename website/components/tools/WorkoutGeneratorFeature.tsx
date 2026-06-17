import { TrackedLink } from "@/components/TrackedLink";

type WorkoutGeneratorFeatureProps = {
  sourcePage: string;
};

export function WorkoutGeneratorFeature({ sourcePage }: WorkoutGeneratorFeatureProps) {
  return (
    <section className="section">
      <article className="panel tool-feature-card">
        <div className="section-head">
          <div className="eyebrow">Featured tool</div>
          <h2 className="section-title">Need help picking a workout plan?</h2>
          <p className="section-copy">
            Answer a few quick questions and get a workout template recommendation based on your goal, schedule,
            equipment, and experience level.
          </p>
        </div>

        <div className="hero-actions">
          <TrackedLink
            className="button button-primary"
            href="/tools/workout-generator"
            eventName="tool_open"
            eventParams={{
              tool_slug: "workout-generator",
              source_page: sourcePage,
            }}
          >
            Open workout generator
          </TrackedLink>
          <TrackedLink
            className="button button-secondary"
            href="/workouts"
            eventName="cta_click"
            eventParams={{
              cta_name: "Browse workout templates",
              cta_context: sourcePage,
            }}
          >
            Browse workout templates
          </TrackedLink>
        </div>
      </article>
    </section>
  );
}
