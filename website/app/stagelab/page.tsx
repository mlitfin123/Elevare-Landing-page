import { Callout } from "@/components/Callout";
import { TrackedLink } from "@/components/TrackedLink";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "StageLab",
  description:
    "StageLab is the competition prep and performance workflow app in the Elevare ecosystem.",
  pathname: "/stagelab",
});

export default function StageLabPage() {
  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">StageLab</div>
        <h1>Competition prep, structured like a system instead of a scramble.</h1>
        <p>
          StageLab is the prep layer of the ecosystem, built for people who need more deliberate structure around
          performance phases, competition timing, and execution.
        </p>
        <div className="button-row">
          <TrackedLink
            className="button button-primary"
            href="/blog/category/prep"
            eventName="cta_click"
            eventParams={{
              cta_name: "Explore prep insights",
              cta_context: "stagelab_hero",
              product: "StageLab",
            }}
          >
            Explore prep insights
          </TrackedLink>
          <TrackedLink
            className="button button-secondary"
            href="/blog"
            eventName="cta_click"
            eventParams={{
              cta_name: "Read insights",
              cta_context: "stagelab_hero",
              product: "StageLab",
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
            <h3>Prep and workflow structure</h3>
            <p>Designed for phase-based thinking, competition preparation, and performance refinement.</p>
          </article>

          <article className="panel">
            <span className="stat-label">Ideal user</span>
            <h3>Competitive and systems-minded users</h3>
            <p>People who want to organize prep with more intention and less guesswork.</p>
          </article>

          <article className="panel">
            <span className="stat-label">Status</span>
            <h3>Coming soon</h3>
            <p>Currently being shaped as the next layer in the ecosystem.</p>
          </article>
        </div>
      </section>

      <Callout title="Where StageLab fits">
        <p>
          StageLab is for the higher-stakes part of performance planning, where timing, progression, and
          execution matter more and the margin for noise is smaller.
        </p>
      </Callout>
    </div>
  );
}
