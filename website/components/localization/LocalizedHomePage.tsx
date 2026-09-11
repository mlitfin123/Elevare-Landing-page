import Image from "next/image";
import { BlogCard } from "@/components/BlogCard";
import { TrackedLink } from "@/components/TrackedLink";
import { StageAnalysisProducts } from "@/components/stage-analysis/StageAnalysisProducts";
import type { HomeMessages } from "@/lib/i18n/marketing-types";
import { localizePathname, type Locale } from "@/lib/i18n/config";
import { getAllPosts } from "@/lib/blog";

const toolHrefs = ["/calculators/", "/workouts/", "/exercises/", "/nutrition/"] as const;

export function LocalizedHomePage({ locale, messages: m }: { locale: Locale; messages: HomeMessages }) {
  const latestPosts = getAllPosts().slice(0, 3);
  const href = (path: string) => localizePathname(path, locale);
  return (
    <div className="container home-page">
      <section className="hero home-hero">
        <div className="eyebrow">{m.hero.eyebrow}</div>
        <h1>{m.hero.title}</h1>
        <p>{m.hero.body}</p>
        <div className="hero-actions">
          <TrackedLink className="btn btn-primary" href={href("/professionals/#guided-matching")} eventName="guided_matching_selected" eventParams={{ source_page: "home_hero" }}>{m.hero.primary}</TrackedLink>
          <TrackedLink className="button button-secondary" href={href("/calculators/")} eventName="cta_click" eventParams={{ cta_name: "Explore free tools", cta_context: "home_hero" }}>{m.hero.secondary}</TrackedLink>
        </div>
        <TrackedLink className="home-browse-link" href={href("/professionals/")} eventName="cta_click" eventParams={{ cta_name: "Browse professionals", cta_context: "home_hero" }}>{m.hero.browse} <span aria-hidden="true">→</span></TrackedLink>
      </section>

      <section className="section home-support" aria-labelledby="support-title">
        <h2 id="support-title">{m.support.title}</h2>
        <ol className="home-support-steps">
          {m.support.steps.map((step, index) => <li key={step.title}><span className="home-step-number" aria-hidden="true">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}
        </ol>
        <p className="fine-print">{m.support.expectations}</p>
        <p className="fine-print">{m.support.trust} <TrackedLink href={href("/trust-safety/")}>{m.support.trustLink} →</TrackedLink></p>
      </section>

      <StageAnalysisProducts locale={locale} source="home-analyses" />

      <section className="section home-resources" id="tools" aria-labelledby="tools-title">
        <h2 className="section-title" id="tools-title">{m.tools.title}</h2>
        <div className="home-resource-grid">
          {m.tools.cards.map((card, index) => <TrackedLink className="panel home-resource-link" key={card.title} href={href(toolHrefs[index])} eventName="cta_click" eventParams={{ cta_name: toolHrefs[index], cta_context: "home_tools" }}>
            <h3>{card.title} <span aria-hidden="true">↗</span></h3><p>{card.body}</p>
          </TrackedLink>)}
        </div>
      </section>

      <section className="section" id="apps" aria-labelledby="apps-title">
        <div className="section-head"><div className="eyebrow">{m.apps.eyebrow}</div><h2 className="section-title" id="apps-title">{m.apps.title}</h2></div>
        <div className="home-app-grid">
          <article className="panel home-app-card" id="logbook">
            <div className="home-app-copy"><h3>Logbook</h3><p>{m.apps.logbook}</p><TrackedLink className="button button-secondary" href={href("/logbook/")} eventName="cta_click" eventParams={{ product: "Logbook", cta_context: "home_apps" }}>{m.apps.logbookCta}</TrackedLink></div>
            <figure className="home-app-visual"><Image src="/images/logbook/log-food-screen.jpg" alt={m.apps.logbookAlt} width={591} height={1280} sizes="140px" /><figcaption>{m.apps.logbookCaption}</figcaption></figure>
          </article>
          <article className="panel home-app-card" id="stagelab">
            <div className="home-app-copy"><h3>StageLab</h3><p>{m.apps.stagelab}</p><TrackedLink className="button button-secondary" href={href("/stagelab/")} eventName="cta_click" eventParams={{ product: "StageLab", cta_context: "home_apps" }}>{m.apps.stagelabCta}</TrackedLink></div>
            <figure className="home-app-visual"><Image src="/blog-posts/mens-physique-classic-physique-prep-12-weeks-out/recommendation.png" alt={m.apps.stageAlt} width={296} height={640} sizes="140px" /><figcaption>{m.apps.stageCaption}</figcaption></figure>
          </article>
        </div>
      </section>

      <section className="section panel home-professional-invite" aria-labelledby="professional-invite-title">
        <div><h2 id="professional-invite-title">{m.professional.title}</h2><p>{m.professional.body}</p></div>
        <TrackedLink className="button button-secondary" href={href("/account/professional-profile/")} eventName="cta_click" eventParams={{ cta_name: "Create professional profile", cta_context: "home_professional" }}>{m.professional.cta}</TrackedLink>
      </section>

      <section className="section home-insights" aria-labelledby="insights-title">
        <div className="home-section-row"><h2 className="section-title" id="insights-title">{m.insights.title}</h2><TrackedLink href="/blog/" hrefLang={locale === "en" ? undefined : "en"}>{m.insights.cta} →</TrackedLink></div>
        {locale !== "en" ? <p className="fine-print">{m.insights.english}</p> : null}
        <div className="blog-grid">{latestPosts.map((post) => <BlogCard key={post.slug} post={post} sourcePage="home_latest_posts" locale={locale} readLabel={m.insights.readArticle} headingLevel={3} />)}</div>
      </section>
    </div>
  );
}
