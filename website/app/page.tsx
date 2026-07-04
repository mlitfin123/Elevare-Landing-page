import { BlogCard } from "@/components/BlogCard";
import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { TrackedLink } from "@/components/TrackedLink";
import { WaitlistForm } from "@/components/WaitlistForm";
import { getAllPosts } from "@/lib/blog";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Fitness Tools, Apps, and Resources",
  description:
    "Explore free calculators, workout templates, exercise guides, nutrition resources, and fitness apps built to help you make progress.",
  pathname: "/",
});

export default function HomePage() {
  const latestPosts = getAllPosts().slice(0, 3);

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">ElevareFit</div>
        <h1>Fitness tools to help you train, eat, and make progress.</h1>
        <p>
          Use free calculators, workouts, exercise guides, nutrition resources, and tracking apps built to
          make fitness easier to follow.
        </p>
        <div className="hero-actions">
          <TrackedLink
            className="btn btn-primary"
            href="/calculators"
            eventName="cta_click"
            eventParams={{
              cta_name: "Explore free tools",
              cta_context: "home_hero",
            }}
          >
            Explore free tools
          </TrackedLink>
          <TrackedLink
            className="button button-store"
            href="/logbook"
            eventName="cta_click"
            eventParams={{
              cta_name: "Download Logbook",
              cta_context: "home_hero",
              product: "Logbook",
            }}
          >
            Download Logbook
          </TrackedLink>
          <TrackedLink
            className="btn btn-secondary"
            href="/#waitlist"
            eventName="cta_click"
            eventParams={{
              cta_name: "Join the Elevare waitlist",
              cta_context: "home_hero",
              product: "Elevare",
            }}
          >
            Join the Elevare waitlist
          </TrackedLink>
        </div>

        <div className="hero-proof" aria-label="Platform highlights">
          <article className="proof-card">
            <span className="proof-label">Free tools</span>
            <div className="proof-value">Calculators, workouts, and guides</div>
            <p className="proof-copy">Use practical resources today instead of landing on a placeholder page.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Logbook</span>
            <div className="proof-value">Track the basics daily</div>
            <p className="proof-copy">Nutrition, workouts, body weight, and progress tracking built for consistency.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">StageLab</span>
            <div className="proof-value">Prep support for physique goals</div>
            <p className="proof-copy">Competition prep tools for people who need more structure around their planning.</p>
          </article>
        </div>
      </section>

      <section className="section" id="tools">
        <div className="section-head">
          <div className="eyebrow">Free fitness tools</div>
          <h2 className="section-title">Start with tools you can use right now.</h2>
          <p className="section-copy">
            ElevareFit is built to be useful today. Explore free calculators, exercise guides, workout
            templates, and restaurant nutrition resources that support everyday progress.
          </p>
        </div>

        <div className="tool-index-grid">
          <article className="panel">
            <span className="stat-label">Calculators</span>
            <h3>Nutrition and training math made simpler.</h3>
            <p>Estimate calories, protein, macros, body composition, training zones, and more with practical tools.</p>
            <div className="button-row">
              <TrackedLink
                className="button button-secondary"
                href="/calculators"
                eventName="cta_click"
                eventParams={{
                  cta_name: "Browse calculators",
                  cta_context: "home_tools",
                }}
              >
                Browse calculators
              </TrackedLink>
            </div>
          </article>
          <article className="panel">
            <span className="stat-label">Exercise library</span>
            <h3>Learn movements with better context.</h3>
            <p>Browse exercise pages by muscle group and equipment so it is easier to choose the right movement.</p>
            <div className="button-row">
              <TrackedLink
                className="button button-secondary"
                href="/exercises"
                eventName="cta_click"
                eventParams={{
                  cta_name: "Browse exercises",
                  cta_context: "home_tools",
                }}
              >
                Browse exercises
              </TrackedLink>
            </div>
          </article>
          <article className="panel">
            <span className="stat-label">Workout templates</span>
            <h3>Start with a plan that matches your week.</h3>
            <p>Use workout templates and the workout finder to get a structure you can actually follow.</p>
            <div className="button-row">
              <TrackedLink
                className="button button-secondary"
                href="/workouts"
                eventName="cta_click"
                eventParams={{
                  cta_name: "Browse workouts",
                  cta_context: "home_tools",
                }}
              >
                Browse workouts
              </TrackedLink>
            </div>
          </article>
          <article className="panel">
            <span className="stat-label">Restaurant nutrition</span>
            <h3>Find options when you are not cooking at home.</h3>
            <p>Search restaurant nutrition pages to compare calories, protein, and smarter meal choices faster.</p>
            <div className="button-row">
              <TrackedLink
                className="button button-secondary"
                href="/nutrition"
                eventName="cta_click"
                eventParams={{
                  cta_name: "Browse nutrition resources",
                  cta_context: "home_tools",
                }}
              >
                Browse nutrition resources
              </TrackedLink>
            </div>
          </article>
        </div>
      </section>

      <section className="section" id="logbook">
        <div className="section-head">
          <div className="eyebrow">Logbook</div>
          <h2 className="section-title">Track nutrition, workouts, body weight, and progress in one place.</h2>
          <p className="section-copy">
            For most visitors, Logbook is the best next step. It is the daily-use app built to help you stay
            consistent with the basics that actually move progress.
          </p>
        </div>

        <div className="trust-layout">
          <article className="trust-feature">
            <h3>Built for the day-to-day side of training.</h3>
            <p>
              Use Logbook to record workouts, monitor body weight, track nutrition, and keep your progress in
              one clean system that is easier to review over time.
            </p>
            <div className="button-row">
              <ProductCtaButtons product="Logbook" context="home_logbook" />
              <TrackedLink
                className="button button-secondary"
                href="/logbook"
                eventName="cta_click"
                eventParams={{
                  cta_name: "Explore Logbook",
                  cta_context: "home_logbook",
                  product: "Logbook",
                }}
              >
                Explore Logbook
              </TrackedLink>
            </div>
          </article>

          <div className="trust-list">
            <article className="trust-point">
              <strong>Track nutrition</strong>
              <p>Stay on top of calories, macros, and meal choices without bouncing between scattered tools.</p>
            </article>
            <article className="trust-point">
              <strong>Track workouts</strong>
              <p>Log sets, exercises, and training patterns so you can see what you are actually doing.</p>
            </article>
            <article className="trust-point">
              <strong>Track body weight and progress</strong>
              <p>Compare trends over time so your decisions come from data instead of guesswork.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="stagelab">
        <div className="section-head">
          <div className="eyebrow">StageLab</div>
          <h2 className="section-title">Prep tools for physique-focused athletes and coaches.</h2>
          <p className="section-copy">
            StageLab is built for competitors, coaches, and prep-minded users who need more structure around
            timelines, planning, and physique-focused decision making.
          </p>
        </div>

        <div className="trust-layout">
          <article className="trust-feature">
            <h3>When prep gets more demanding, structure matters more.</h3>
            <p>
              Use StageLab for prep timelines, check-ins, review workflows, and planning tools that support a
              more deliberate bodybuilding or physique-prep process.
            </p>
            <div className="button-row">
              <TrackedLink
                className="button button-store"
                href="/stagelab"
                eventName="cta_click"
                eventParams={{
                  cta_name: "Explore StageLab",
                  cta_context: "home_stagelab",
                  product: "StageLab",
                }}
              >
                Explore StageLab
              </TrackedLink>
              <TrackedLink
                className="button button-secondary"
                href="/blog/category/prep-files"
                eventName="cta_click"
                eventParams={{
                  cta_name: "Read prep files",
                  cta_context: "home_stagelab",
                  product: "StageLab",
                }}
              >
                Read prep files
              </TrackedLink>
            </div>
          </article>

          <div className="trust-list">
            <article className="trust-point">
              <strong>Competition prep tools</strong>
              <p>Plan around timelines, check-ins, and weekly decisions with more clarity.</p>
            </article>
            <article className="trust-point">
              <strong>Prep timelines and checklists</strong>
              <p>Use countdowns, timelines, and prep content that fits bodybuilding and physique goals.</p>
            </article>
            <article className="trust-point">
              <strong>Physique-focused planning</strong>
              <p>Follow a system that keeps your feedback loop cleaner as prep gets more serious.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">Elevare marketplace coming soon</div>
          <h2 className="section-title">Looking for personal guidance?</h2>
          <p className="section-copy">
            Elevare is one upcoming part of the ElevareFit platform. It is being built as a trainer and coach
            marketplace designed to help people find the right fitness professional with more clarity.
          </p>
        </div>

        <div className="landing-hero">
          <div className="hero-copy">
            <h2 className="section-title">Keep the waitlist visible without making it the whole site.</h2>
            <p>
              If you want personal support instead of self-guided tools, join the Elevare waitlist to hear
              when marketplace access opens for members and coaches.
            </p>
            <div className="hero-proof" aria-label="Why join the Elevare waitlist">
              <article className="proof-card">
                <span className="proof-label">Members</span>
                <div className="proof-value">Find the right fit</div>
                <p className="proof-copy">Hear when you can start exploring trainer and coach options more easily.</p>
              </article>
              <article className="proof-card">
                <span className="proof-label">Coaches</span>
                <div className="proof-value">Reach better-fit clients</div>
                <p className="proof-copy">Stay updated on when the marketplace opens and how access will roll out.</p>
              </article>
              <article className="proof-card">
                <span className="proof-label">Coming soon</span>
                <div className="proof-value">Marketplace access updates</div>
                <p className="proof-copy">Join now so you are not waiting to hear about the next release step.</p>
              </article>
            </div>
            <div className="hero-actions">
              <TrackedLink
                className="btn btn-secondary"
                href="/elevare"
                eventName="cta_click"
                eventParams={{
                  cta_name: "Learn more about Elevare",
                  cta_context: "home_waitlist_section",
                  product: "Elevare",
                }}
              >
                Learn more about Elevare
              </TrackedLink>
            </div>
          </div>
          <WaitlistForm />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">Latest insights</div>
          <h2 className="section-title">Keep learning between workouts.</h2>
          <p className="section-copy">
            Read practical articles on training, nutrition, tracking, prep, and the small decisions that make
            consistency easier.
          </p>
        </div>

        <div className="button-row">
          <TrackedLink
            className="button button-secondary"
            href="/blog"
            eventName="cta_click"
            eventParams={{
              cta_name: "Browse blog",
              cta_context: "home_blog",
            }}
          >
            Browse the blog
          </TrackedLink>
        </div>

        <div className="blog-grid">
          {latestPosts.map((post) => (
            <BlogCard key={post.slug} post={post} sourcePage="home_latest_posts" />
          ))}
        </div>
      </section>
    </div>
  );
}
