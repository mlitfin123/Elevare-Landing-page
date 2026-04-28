import Link from "next/link";
import { WaitlistForm } from "@/components/WaitlistForm";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Founding Waitlist",
  description:
    "Join the Elevare waitlist to hear when we launch and learn about a simpler way to find the right coach.",
  pathname: "/",
});

export default function HomePage() {
  return (
    <div className="container">
      <section className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow">Coming soon</div>
          <h1 className="hero-title">A better way to connect members with the right coaches.</h1>
          <p className="hero-lead">
            Elevare is built to make it easier for members to discover trusted coaches and for coaches to
            reach the right clients. Join the waitlist to hear when we launch.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#waitlist">
              Join the waitlist
            </a>
            <a className="btn btn-secondary" href="#how-it-works">
              See how it works
            </a>
          </div>

          <div className="hero-proof" aria-label="Why join early">
            <article className="proof-card">
              <span className="proof-label">Founding access</span>
              <div className="proof-value">Early launch updates</div>
              <p className="proof-copy">Be first to know when Elevare opens and when availability expands.</p>
            </article>
            <article className="proof-card">
              <span className="proof-label">For members</span>
              <div className="proof-value">Find a coach who fits</div>
              <p className="proof-copy">Search for the support, style, and specialty that matches your goals.</p>
            </article>
            <article className="proof-card">
              <span className="proof-label">For coaches</span>
              <div className="proof-value">Reach the right clients</div>
              <p className="proof-copy">Show what you offer and connect with people looking for your expertise.</p>
            </article>
          </div>
        </div>

        <WaitlistForm />
      </section>

      <section className="value-bar" aria-label="Value proposition">
        <article className="value-panel">
          <strong>Find the right fit</strong>
          <p>Browse coaches based on what matters most to you, from training style to goals and experience.</p>
        </article>
        <article className="value-panel">
          <strong>Grow with better visibility</strong>
          <p>Give coaches a clearer way to show what they offer and connect with the right people.</p>
        </article>
        <article className="value-panel">
          <strong>Know when we launch</strong>
          <p>Join the waitlist so you hear about timing, availability, and your chance to get started.</p>
        </article>
      </section>

      <section className="section" id="benefits">
        <div className="section-head">
          <div className="eyebrow">Benefits</div>
          <h2 className="section-title">What Elevare is building for members and coaches.</h2>
          <p className="section-copy">
            Whether you are looking for support or offering it, Elevare is meant to make that connection
            clearer and easier.
          </p>
        </div>

        <div className="card-grid">
          <article className="info-card">
            <div className="card-index">01</div>
            <h3>For members</h3>
            <p>Find professionals who align with your goals instead of sorting through endless generic options.</p>
          </article>
          <article className="info-card">
            <div className="card-index">02</div>
            <h3>For coaches</h3>
            <p>Show people who you help, what you offer, and why you are the right fit for their goals.</p>
          </article>
          <article className="info-card">
            <div className="card-index">03</div>
            <h3>Join early</h3>
            <p>Get updates on timing, availability, and when Elevare is ready for you to take the next step.</p>
          </article>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="section-head">
          <div className="eyebrow">How it works</div>
          <h2 className="section-title">How it will work.</h2>
          <p className="section-copy">
            We are keeping the experience simple so you can quickly find the right coach and know when it is
            your turn to join.
          </p>
        </div>

        <div className="steps">
          <article className="step-card">
            <span className="step-number">Step 01</span>
            <h3>Join the waitlist</h3>
            <p>Tell us a little about who you are so we can send you the right updates as launch gets closer.</p>
          </article>
          <article className="step-card">
            <span className="step-number">Step 02</span>
            <h3>Hear when we launch</h3>
            <p>We will keep you posted on timing, availability, and when you can start exploring Elevare.</p>
          </article>
          <article className="step-card">
            <span className="step-number">Step 03</span>
            <h3>Start finding your fit</h3>
            <p>
              Once live, you will be able to discover coaches who match your goals and get started more
              easily.
            </p>
          </article>
        </div>
      </section>

      <section className="section" id="trust">
        <div className="section-head">
          <div className="eyebrow">Why join</div>
          <h2 className="section-title">A better way to connect with the right coach is on the way.</h2>
          <p className="section-copy">
            Join the waitlist if you want an easier path to discovering coaches, understanding your options,
            and hearing as soon as Elevare becomes available.
          </p>
        </div>

        <div className="trust-layout">
          <article className="trust-feature">
            <h3>We want the search for a coach to feel less confusing and more personal.</h3>
            <p>
              Elevare is focused on helping you spend less time guessing, more time finding the right support,
              and more quickly taking the next step toward your goals.
            </p>
          </article>

          <div className="trust-list">
            <article className="trust-point">
              <strong>Hear about launch timing</strong>
              <p>Join the list to know when Elevare opens and when more people can start using it.</p>
            </article>
            <article className="trust-point">
              <strong>Know what is coming</strong>
              <p>We will share updates so you know what the experience will look like and when to expect access.</p>
            </article>
            <article className="trust-point">
              <strong>Be first in line</strong>
              <p>Waitlist members will be the first to hear when it is time to sign up and get started.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="final-card">
          <div className="final-copy">
            <h2>Explore the Elevare ecosystem.</h2>
            <p>
              See how Logbook, StageLab, and Elevare fit together across daily training, performance systems,
              and coach discovery.
            </p>
          </div>
          <div className="final-actions">
            <Link className="btn btn-primary" href="/apps">
              Explore apps
            </Link>
            <Link className="btn btn-secondary" href="/blog">
              Read the blog
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
