import { Callout } from "@/components/Callout";
import { TrackedLink } from "@/components/TrackedLink";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Elevare",
  description:
    "Elevare is the coming-soon coaching marketplace on ElevareFit, built to help people find the right trainer or coach.",
  pathname: "/elevare",
});

export default function ElevarePage() {
  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Elevare</div>
        <h1>The coming-soon marketplace for finding the right trainer or coach.</h1>
        <p>
          Elevare is built to help members discover better-fit coaching support and help coaches get in front
          of the right people with more clarity.
        </p>
        <div className="button-row">
          <TrackedLink
            className="button button-primary"
            href="/#waitlist"
            eventName="cta_click"
            eventParams={{
              cta_name: "Join the waitlist",
              cta_context: "elevare_hero",
              product: "Elevare",
            }}
          >
            Join the waitlist
          </TrackedLink>
          <TrackedLink
            className="button button-secondary"
            href="/apps"
            eventName="cta_click"
            eventParams={{
              cta_name: "Explore apps",
              cta_context: "elevare_hero",
              product: "Elevare",
            }}
          >
            Explore apps
          </TrackedLink>
        </div>
      </section>

      <section className="section">
        <div className="grid-3">
          <article className="panel">
            <span className="stat-label">Role</span>
            <h3>Coach discovery</h3>
            <p>Built to improve the way members and coaches find the right fit.</p>
          </article>

          <article className="panel">
            <span className="stat-label">Ideal user</span>
            <h3>Members and coaches</h3>
            <p>People looking for coaching support and coaches who want better alignment with the right clients.</p>
          </article>

          <article className="panel">
            <span className="stat-label">Status</span>
            <h3>Coming soon</h3>
            <p>Actively being developed as the marketplace layer inside the broader ElevareFit platform.</p>
          </article>
        </div>
      </section>

      <Callout title="Where Elevare fits">
        <p>
          Elevare is focused on making coach discovery feel clearer, so members can find support with more
          confidence and coaches can connect with better-fit clients.
        </p>
      </Callout>
    </div>
  );
}
