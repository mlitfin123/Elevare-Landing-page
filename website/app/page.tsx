import Link from "next/link";
import { BlogCard } from "@/components/BlogCard";
import { Callout } from "@/components/Callout";
import { getAllPosts } from "@/lib/blog";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Elevare ecosystem",
  description:
    "A clean content hub for Elevare, Logbook, and StageLab across tracking, prep, training, and coaching.",
  pathname: "/",
});

export default function HomePage() {
  const latestPosts = getAllPosts().slice(0, 3);

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">Performance ecosystem</div>
        <h1>One ecosystem for training, prep, and coaching.</h1>
        <p>
          Elevare Fit LLC is building a focused set of products around performance behavior: how people
          track it, prepare for it, and find the right support to improve it.
        </p>
        <div className="button-row">
          <Link className="button button-primary" href="/apps">
            Explore apps
          </Link>
          <Link className="button button-secondary" href="/blog">
            Read the blog
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">Products</div>
          <h2>The three product pillars.</h2>
          <p>
            Each product serves a different layer of the same performance ecosystem, from daily logging
            to higher-level prep to coach discovery.
          </p>
        </div>

        <div className="grid-3">
          <article className="panel">
            <span className="stat-label">Logbook</span>
            <h3>Track the work.</h3>
            <p>
              Logbook helps people capture workouts, review patterns, and make training behavior visible.
            </p>
            <div className="button-row">
              <Link className="button button-secondary" href="/logbook">
                Explore Logbook
              </Link>
            </div>
          </article>

          <article className="panel">
            <span className="stat-label">StageLab</span>
            <h3>Structure the prep.</h3>
            <p>
              StageLab is being built for competition prep and performance workflows that require more rigor.
            </p>
            <div className="button-row">
              <Link className="button button-secondary" href="/stagelab">
                Explore StageLab
              </Link>
            </div>
          </article>

          <article className="panel">
            <span className="stat-label">Elevare</span>
            <h3>Find the right coach.</h3>
            <p>
              Elevare is the marketplace layer, helping the right members connect with the right coaching fit.
            </p>
            <div className="button-row">
              <Link className="button button-secondary" href="/elevare">
                Explore Elevare
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">Latest writing</div>
          <h2>Articles built around real fitness behavior.</h2>
          <p>
            The blog is designed to be useful, specific, and product-aware without turning into a generic
            marketing feed.
          </p>
        </div>

        <div className="blog-grid">
          {latestPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </section>

      <Callout title="This is meant to stay simple for now.">
        <p>
          There is no CMS or database in this first version. Content lives in local MDX files so you can move
          fast, ship clean static pages, and grow into a more complex setup later only if you need it.
        </p>
      </Callout>
    </div>
  );
}
