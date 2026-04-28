import Link from "next/link";
import { Callout } from "@/components/Callout";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Elevare",
  description:
    "Elevare is the coaching marketplace in the ecosystem, built to connect members and coaches with more clarity.",
  pathname: "/elevare",
});

export default function ElevarePage() {
  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Elevare</div>
        <h1>A marketplace built around fit, clarity, and better coaching discovery.</h1>
        <p>
          Elevare is built to help members discover coaches with more confidence and help coaches get in front
          of the right people with more clarity.
        </p>
        <div className="button-row">
          <Link className="button button-primary" href="/#waitlist">
            Join the waitlist
          </Link>
          <Link className="button button-secondary" href="/apps">
            Explore apps
          </Link>
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
            <h3>Marketplace in progress</h3>
            <p>Actively being developed as the relationship layer in the ecosystem.</p>
          </article>
        </div>
      </section>

      <Callout title="Where Elevare fits">
        <p>
          Elevare turns the ecosystem outward. Tracking and prep matter most when they connect people to the
          right support, and Elevare is the piece built to make that connection easier.
        </p>
      </Callout>
    </div>
  );
}
