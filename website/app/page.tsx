import Image from "next/image";
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
            href="/tools"
            eventName="cta_click"
            eventParams={{
              cta_name: "Explore free tools",
              cta_context: "home_hero",
            }}
          >
            Explore free tools
          </TrackedLink>
          <TrackedLink
            className="button button-secondary"
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
            className="hero-text-link"
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

        <div className="hero-proof hero-overview-grid" aria-label="Platform highlights">
          <TrackedLink
            className="proof-card proof-card-link"
            href="/tools"
            eventName="overview_click"
            eventParams={{
              overview_name: "Free Tools",
              overview_context: "home_hero",
            }}
          >
            <span className="proof-label">Free tools</span>
            <div className="proof-value">Calculators, workouts, and guides</div>
            <p className="proof-copy">Open the tools hub for calculators, workouts, exercise guides, and nutrition resources.</p>
            <span className="proof-action">Explore free tools</span>
          </TrackedLink>
          <TrackedLink
            className="proof-card proof-card-link"
            href="/logbook"
            eventName="overview_click"
            eventParams={{
              overview_name: "Logbook",
              overview_context: "home_hero",
              product: "Logbook",
            }}
          >
            <span className="proof-label">Logbook</span>
            <div className="proof-value">Track the basics daily</div>
            <p className="proof-copy">See the daily-use app for workouts, nutrition, body weight, and progress tracking.</p>
            <span className="proof-action">View Logbook</span>
          </TrackedLink>
          <TrackedLink
            className="proof-card proof-card-link"
            href="/stagelab"
            eventName="overview_click"
            eventParams={{
              overview_name: "StageLab",
              overview_context: "home_hero",
              product: "StageLab",
            }}
          >
            <span className="proof-label">StageLab</span>
            <div className="proof-value">Prep support for physique goals</div>
            <p className="proof-copy">See the prep app built for structure, check-ins, and competition-focused planning.</p>
            <span className="proof-action">View StageLab</span>
          </TrackedLink>
        </div>
      </section>

      <section className="section section-compact" aria-labelledby="next-step-title">
        <div className="section-head section-head-compact">
          <div className="eyebrow">Choose your next step</div>
          <h2 className="section-title section-title-compact" id="next-step-title">
            Choose your next step.
          </h2>
        </div>

        <div className="next-step-grid">
          <TrackedLink
            className="panel next-step-card"
            href="/tools"
            eventName="next_step_click"
            eventParams={{
              next_step: "free_fitness_tools",
              next_step_context: "home_next_step",
            }}
          >
            <span className="stat-label">Free tools</span>
            <h3>I want free fitness tools</h3>
            <p>Go straight to calculators, workout templates, exercise guides, and nutrition resources.</p>
            <span className="proof-action">Open the tools hub</span>
          </TrackedLink>
          <TrackedLink
            className="panel next-step-card"
            href="/logbook"
            eventName="next_step_click"
            eventParams={{
              next_step: "track_my_progress",
              next_step_context: "home_next_step",
              product: "Logbook",
            }}
          >
            <span className="stat-label">Logbook</span>
            <h3>I want to track my progress</h3>
            <p>Start with the app built for workouts, nutrition, body weight, and day-to-day consistency.</p>
            <span className="proof-action">See Logbook</span>
          </TrackedLink>
          <TrackedLink
            className="panel next-step-card"
            href="/stagelab"
            eventName="next_step_click"
            eventParams={{
              next_step: "physique_competition_prep",
              next_step_context: "home_next_step",
              product: "StageLab",
            }}
          >
            <span className="stat-label">StageLab</span>
            <h3>I am preparing for a physique competition</h3>
            <p>Go to the prep-focused app for timelines, check-ins, and more deliberate weekly decisions.</p>
            <span className="proof-action">See StageLab</span>
          </TrackedLink>
          <TrackedLink
            className="panel next-step-card"
            href="/#waitlist"
            eventName="next_step_click"
            eventParams={{
              next_step: "find_or_become_a_coach",
              next_step_context: "home_next_step",
              product: "Elevare",
            }}
          >
            <span className="stat-label">Elevare</span>
            <h3>I want to find or become a coach</h3>
            <p>Join the waitlist for the upcoming marketplace built around clearer coach discovery and fit.</p>
            <span className="proof-action">Join the waitlist</span>
          </TrackedLink>
        </div>
      </section>

      <section className="section" id="tools">
        <div className="section-head">
          <div className="eyebrow">Free fitness tools</div>
          <h2 className="section-title">Start with tools you can use right now.</h2>
          <p className="section-copy">
            Open calculators, exercise guides, workout templates, and restaurant nutrition resources that
            support everyday progress.
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
            Logbook is the daily-use app for people who want the basics in one place without turning tracking
            into another job.
          </p>
        </div>

        <div className="trust-layout">
          <article className="trust-feature">
            <h3>Built for the day-to-day side of consistency.</h3>
            <p>
              Log workouts, nutrition, body weight, and progress in one clean system so the week is easier to
              review and repeat.
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

          <div className="trust-list product-side-stack">
            <TrackedLink
              className="proof-card product-visual-card"
              href="/logbook"
              eventName="cta_click"
              eventParams={{
                cta_name: "View Logbook product preview",
                cta_context: "home_logbook",
                product: "Logbook",
              }}
            >
              <span className="proof-label">Product preview</span>
              <div className="product-visual-frame">
                <Image
                  src="/blog-posts/how-many-calories-should-i-eat-to-lose-weight/featured.png"
                  alt="Logbook product visual showing calorie tracking and daily targets"
                  width={1536}
                  height={1024}
                />
              </div>
              <div className="product-caption">
                <strong>Live on iOS and Android</strong>
                <span>Use Logbook when you want one daily system for food, training, and progress review.</span>
              </div>
            </TrackedLink>
            <article className="trust-point">
              <strong>Track the basics once</strong>
              <p>Keep training, nutrition, body weight, and progress in one place instead of scattered apps.</p>
            </article>
            <article className="trust-point">
              <strong>Review clearer trends</strong>
              <p>See what is actually happening week to week so decisions come from patterns instead of guesswork.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="stagelab">
        <div className="section-head">
          <div className="eyebrow">StageLab</div>
          <h2 className="section-title">Prep tools for physique-focused athletes and coaches.</h2>
          <p className="section-copy">
            StageLab is the more focused option for competitors and coaches who need prep timelines, check-ins,
            and cleaner weekly decisions.
          </p>
        </div>

        <div className="trust-layout">
          <article className="trust-feature">
            <h3>When prep gets more demanding, the feedback loop matters more.</h3>
            <p>
              Use StageLab for prep timelines, check-ins, and review workflows that help make adjustments feel
              more deliberate.
            </p>
            <div className="button-row">
              <ProductCtaButtons product="StageLab" context="home_stagelab" />
              <TrackedLink
                className="button button-secondary"
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
            </div>
          </article>

          <div className="trust-list product-side-stack">
            <TrackedLink
              className="proof-card product-visual-card"
              href="/stagelab"
              eventName="cta_click"
              eventParams={{
                cta_name: "View StageLab product preview",
                cta_context: "home_stagelab",
                product: "StageLab",
              }}
            >
              <span className="proof-label">Product preview</span>
              <div className="product-visual-frame product-visual-frame-tall">
                <Image
                  src="/blog-posts/mens-physique-classic-physique-prep-12-weeks-out/recommendation.png"
                  alt="StageLab product visual showing a cardio increase recommendation screen"
                  width={296}
                  height={640}
                />
              </div>
              <div className="product-caption">
                <strong>Live on iOS</strong>
                <span>Use StageLab when prep timing, review quality, and adjustment structure matter more.</span>
              </div>
            </TrackedLink>
            <article className="trust-point">
              <strong>Review weekly check-ins</strong>
              <p>Keep your photos, timelines, and week-to-week decisions inside a more prep-focused workflow.</p>
            </article>
            <article className="trust-point">
              <strong>Plan around the timeline</strong>
              <p>Use a structure that fits bodybuilding and physique prep once the margin for noise gets smaller.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="marketplace">
        <div className="section-head">
          <div className="eyebrow">Elevare marketplace</div>
          <h2 className="section-title">Coaching discovery for members and coaches, coming soon.</h2>
          <p className="section-copy">
            Elevare is the upcoming marketplace for people looking for coaching support and coaches who want a
            better-fit way to get discovered.
          </p>
        </div>

        <div className="landing-hero">
          <div className="hero-copy marketplace-copy">
            <div className="status-row">
              <span className="status-chip">Coming soon</span>
            </div>
            <p className="marketplace-intro">
              Join the waitlist if you want updates on member access, coach onboarding, and rollout timing as
              the marketplace gets closer to launch.
            </p>
            <div className="hero-proof marketplace-grid" aria-label="Who Elevare is for">
              <article className="proof-card">
                <span className="proof-label">Members</span>
                <div className="proof-value">Find a better-fit coach</div>
                <p className="proof-copy">Join if you want early updates when member access and coach discovery open.</p>
              </article>
              <article className="proof-card">
                <span className="proof-label">Coaches</span>
                <div className="proof-value">Get discovered more clearly</div>
                <p className="proof-copy">Join if you want rollout details, coach access updates, and onboarding timing.</p>
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
