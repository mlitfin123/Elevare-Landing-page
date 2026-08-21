import Image from "next/image";
import { BlogCard } from "@/components/BlogCard";
import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { TrackedLink } from "@/components/TrackedLink";
import { getAllPosts } from "@/lib/blog";
import { getMarketplaceCategories, getMarketplaceProfessionals } from "@/lib/marketplace";
import { countEligibleMarketplaceProfiles, findTopCategories, formatMarketplaceSocialProofCount } from "@/lib/marketplace-helpers";
import { QUICK_ANALYSIS_PRICE_DISPLAY } from "@/lib/quick-analysis";
import { getQuickAnalysisEntryHref } from "@/lib/quick-analysis-attribution";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Elevare | Find Trainers, Coaches & Wellness Support",
  description:
    "Discover personal trainers, nutrition coaches, bodybuilding coaches, life coaches, wellness specialists, and more on Elevare.",
  pathname: "/",
});

export default async function HomePage() {
  const latestPosts = getAllPosts().slice(0, 3);
  const [categories, professionals] = await Promise.all([
    getMarketplaceCategories(),
    getMarketplaceProfessionals(),
  ]);
  const topCategories = findTopCategories(categories, professionals, 4);
  const marketplaceSocialProof = formatMarketplaceSocialProofCount(
    countEligibleMarketplaceProfiles(professionals),
  );

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">ElevareFit</div>
        <h1>Find the right support for your goals.</h1>
        <p>
          Discover trainers, coaches, nutrition and wellness professionals, plus free fitness tools and
          tracking apps that help make progress easier to follow.
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
            href="/professionals/"
            eventName="cta_click"
            eventParams={{
              cta_name: "Find your match",
              cta_context: "home_hero",
              product: "Elevare",
            }}
          >
            Find your match
          </TrackedLink>
        </div>

        <div className="hero-proof hero-overview-grid" aria-label="Platform highlights">
          <TrackedLink
            className="proof-card proof-card-link"
            href="/calculators"
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
            <p className="proof-copy">Review competition timelines, weekly check-ins, progress photos, and plan recommendations.</p>
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
            href="/calculators"
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
            <p>Use StageLab for show timelines, weekly check-ins, progress photos, and prep recommendations.</p>
            <span className="proof-action">See StageLab</span>
          </TrackedLink>
          <TrackedLink
            className="panel next-step-card"
            href="/professionals"
            eventName="next_step_click"
            eventParams={{
              next_step: "find_or_become_a_professional",
              next_step_context: "home_next_step",
              product: "Elevare",
            }}
          >
            <span className="stat-label">Elevare</span>
            <h3>I want to find or become a coach</h3>
            <p>Browse profiles now, or create your public profile if you want to join the marketplace.</p>
            <span className="proof-action">Open the marketplace</span>
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
            <p>Search restaurant menus and compare calories, protein, carbohydrates, fat, and serving sizes.</p>
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
          <h2 className="section-title">Log workouts, food, body weight, and progress.</h2>
          <p className="section-copy">
            Logbook records daily training, food, macros, body weight, and progress without unnecessary setup.
          </p>
        </div>

        <div className="trust-layout">
          <article className="trust-feature">
            <h3>Keep a daily record you can review.</h3>
            <p>
              Record workouts, meals, macros, body weight, and progress. Review the same history before your next
              session or nutrition adjustment.
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
                  src="/blog-posts/how-many-calories-should-i-eat-to-lose-weight/featured.webp"
                  alt="Logbook product visual showing calorie tracking and daily targets"
                  width={1200}
                  height={800}
                  sizes="(max-width: 900px) 92vw, 38vw"
                />
              </div>
              <div className="product-caption">
                <strong>Live on iOS and Android</strong>
                <span>Record food, training, and bodyweight, then review the history from the same app.</span>
              </div>
            </TrackedLink>
            <article className="trust-point">
              <strong>Record each day</strong>
              <p>Log exercises, sets, reps, food, macros, and body weight while the details are current.</p>
            </article>
            <article className="trust-point">
              <strong>Compare progress over time</strong>
              <p>Review training performance, nutrition, and bodyweight history before changing your targets.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="stagelab">
        <div className="section-head">
          <div className="eyebrow">StageLab</div>
          <h2 className="section-title">Prep tools for physique-focused athletes and coaches.</h2>
          <p className="section-copy">
            StageLab gives competitors and coaches a place to review prep timelines, weekly check-ins, photos,
            plan execution, recovery, and recommendations.
          </p>
        </div>

        <div className="trust-layout">
          <article className="trust-feature">
            <h3>Review the full week before changing the plan.</h3>
            <p>
              Upload check-in photos, record prep data, compare changes over time, and see whether StageLab
              recommends holding or adjusting the active plan.
            </p>
            <div className="button-row">
              <ProductCtaButtons product="StageLab" context="home_stagelab" />
              <TrackedLink
                className="button button-secondary"
                href={getQuickAnalysisEntryHref("homepage")}
                eventName="cta_click"
                eventParams={{
                  cta_name: `Try Quick Analysis for ${QUICK_ANALYSIS_PRICE_DISPLAY}`,
                  cta_context: "home_stagelab",
                  product: "StageLab Quick Analysis",
                  source: "homepage",
                }}
              >
                Try Quick Analysis — {QUICK_ANALYSIS_PRICE_DISPLAY} one time
              </TrackedLink>
              <TrackedLink
                className="hero-text-link"
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
                <strong>Live on iOS and Android</strong>
                <span>See the active plan, recommendation, confidence, and reasons for each weekly check-in.</span>
              </div>
            </TrackedLink>
            <article className="trust-point">
              <strong>Review weekly check-ins</strong>
              <p>Compare progress photos with bodyweight, nutrition, cardio, training, and recovery data.</p>
            </article>
            <article className="trust-point">
              <strong>Plan around the timeline</strong>
              <p>Keep the division, show date, weeks out, and current prep plan visible during each review.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="marketplace">
        <div className="section-head">
          <div className="eyebrow">Elevare marketplace</div>
          <h2 className="section-title">Find support or join as a pro.</h2>
          <p className="section-copy">
            Compare published professional profiles, save options, and send consultation requests. Professionals
            can create a profile and submit it for review.
          </p>
        </div>

        <div className="landing-hero">
          <div className="hero-copy marketplace-copy">
            <p className="marketplace-intro">
              Clients can browse publicly and create an account only when they want to save a profile or send a
              request. Pros can create a profile, add services and credentials, and submit it for approval.
            </p>
            <div className="hero-proof marketplace-grid" aria-label="Who Elevare is for">
              <article className="proof-card">
                <span className="proof-label">Clients</span>
                <div className="proof-value">Compare professionals</div>
                <p className="proof-copy">Review specialty, location, service mode, pricing, credentials, and professional category.</p>
              </article>
              <article className="proof-card">
                <span className="proof-label">For pros</span>
                <div className="proof-value">Publish the details clients need</div>
                <p className="proof-copy">List categories, specialties, credentials, service modes, location, and price details.</p>
              </article>
            </div>
            <div className="hero-actions">
              <TrackedLink
                className="btn btn-primary"
                href="/professionals/"
                eventName="cta_click"
                eventParams={{
                  cta_name: "Find your match",
                  cta_context: "home_marketplace_section",
                  product: "Elevare",
                }}
              >
                Find your match
              </TrackedLink>
              <TrackedLink
                className="button button-secondary"
                href="/account/professional-profile/"
                eventName="cta_click"
                eventParams={{
                  cta_name: "Join as a Pro",
                  cta_context: "home_marketplace_section",
                  product: "Elevare",
                }}
              >
                Join as a Pro
              </TrackedLink>
            </div>
          </div>

          <aside className="waitlist-card marketplace-side-card">
            <div className="card-kicker">Marketplace snapshot</div>
            <h2>Browse by category.</h2>
            <p>
              Start with the kind of support you want, then narrow by location, service mode, and specialty.
            </p>
            <div className="micro-trust marketplace-category-list">
              {topCategories.map((category) => (
                <TrackedLink
                  key={category.slug}
                  className="proof-card proof-card-link compact-category-card"
                  href={`/professionals/${category.slug}`}
                  eventName="professional_category_selected"
                  eventParams={{
                    source_page: "home_marketplace",
                    category: category.slug,
                  }}
                >
                  <span className="proof-label">{category.label}</span>
                  <p className="proof-copy">{category.shortDescription}</p>
                  <span className="proof-action">Browse</span>
                </TrackedLink>
              ))}
            </div>
            <div className="form-note">
              {marketplaceSocialProof
                ? `${marketplaceSocialProof} are currently available in the public directory.`
                : "Browse by category, location, and specialty to narrow the right fit."}
            </div>
          </aside>
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
