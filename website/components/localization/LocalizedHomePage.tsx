import Image from "next/image";
import { BlogCard } from "@/components/BlogCard";
import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { TrackedLink } from "@/components/TrackedLink";
import type { HomeMessages } from "@/lib/i18n/marketing-types";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/translate";
import { getAllPosts } from "@/lib/blog";
import { getMarketplaceCategories, getMarketplaceProfessionals } from "@/lib/marketplace";
import { countEligibleMarketplaceProfiles, findTopCategories, formatMarketplaceSocialProofCount } from "@/lib/marketplace-helpers";
import type { MarketplaceCategoryTranslation } from "@/lib/i18n/marketing-types";
import { QUICK_ANALYSIS_PRICE_DISPLAY } from "@/lib/quick-analysis";
import { getQuickAnalysisEntryHref } from "@/lib/quick-analysis-attribution";

const overviewHrefs = ["/calculators/", "/logbook/", "/stagelab/"] as const;
const nextStepHrefs = ["/calculators/", "/logbook/", "/stagelab/", "/professionals/"] as const;
const toolHrefs = ["/calculators/", "/exercises/", "/workouts/", "/nutrition/"] as const;

function hrefForLocale(href: string, locale: Locale) {
  return href === "/logbook/" || href === "/stagelab/" || href === "/"
    ? localizePathname(href, locale)
    : href;
}

function hrefLanguage(href: string, locale: Locale) {
  return locale !== "en" && hrefForLocale(href, locale) === href ? "en" : undefined;
}

export async function LocalizedHomePage({
  locale,
  messages,
  categoryTranslations,
}: {
  locale: Locale;
  messages: HomeMessages;
  categoryTranslations: Record<string, MarketplaceCategoryTranslation>;
}) {
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
        <div className="eyebrow">{messages.hero.eyebrow}</div>
        <h1>{messages.hero.title}</h1>
        <p>{messages.hero.body}</p>
        <div className="hero-actions">
          <TrackedLink className="btn btn-primary" href="/calculators/" hrefLang={hrefLanguage("/calculators/", locale)} eventName="cta_click" eventParams={{ cta_name: "Explore free tools", cta_context: "home_hero" }}>
            {messages.hero.toolsCta}
          </TrackedLink>
          <TrackedLink className="button button-secondary" href={localizePathname("/logbook/", locale)} eventName="cta_click" eventParams={{ cta_name: "Download Logbook", cta_context: "home_hero", product: "Logbook" }}>
            {messages.hero.logbookCta}
          </TrackedLink>
          <TrackedLink className="hero-text-link" href="/professionals/" hrefLang={hrefLanguage("/professionals/", locale)} eventName="cta_click" eventParams={{ cta_name: "Find your match", cta_context: "home_hero", product: "Elevare" }}>
            {messages.hero.marketplaceCta}
          </TrackedLink>
        </div>

        <div className="hero-proof hero-overview-grid" aria-label={messages.hero.highlightsLabel}>
          {messages.overview.map((card, index) => (
            <TrackedLink
              className="proof-card proof-card-link"
              href={hrefForLocale(overviewHrefs[index] ?? "/", locale)}
              hrefLang={hrefLanguage(overviewHrefs[index] ?? "/", locale)}
              eventName="overview_click"
              eventParams={{ overview_name: ["Free Tools", "Logbook", "StageLab"][index], overview_context: "home_hero" }}
              key={card.label}
            >
              <span className="proof-label">{card.label}</span>
              <div className="proof-value">{card.title}</div>
              <p className="proof-copy">{card.body}</p>
              <span className="proof-action">{card.action}</span>
            </TrackedLink>
          ))}
        </div>
      </section>

      <section className="section section-compact" aria-labelledby="localized-next-step-title">
        <div className="section-head section-head-compact">
          <div className="eyebrow">{messages.nextStep.eyebrow}</div>
          <h2 className="section-title section-title-compact" id="localized-next-step-title">{messages.nextStep.title}</h2>
        </div>
        <div className="next-step-grid">
          {messages.nextStep.cards.map((card, index) => (
            <TrackedLink
              className="panel next-step-card"
              href={hrefForLocale(nextStepHrefs[index] ?? "/", locale)}
              hrefLang={hrefLanguage(nextStepHrefs[index] ?? "/", locale)}
              eventName="next_step_click"
              eventParams={{ next_step: ["free_fitness_tools", "track_my_progress", "physique_competition_prep", "find_or_become_a_professional"][index], next_step_context: "home_next_step" }}
              key={card.title}
            >
              <span className="stat-label">{card.label}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <span className="proof-action">{card.action}</span>
            </TrackedLink>
          ))}
        </div>
      </section>

      <section className="section" id="tools">
        <div className="section-head">
          <div className="eyebrow">{messages.tools.eyebrow}</div>
          <h2 className="section-title">{messages.tools.title}</h2>
          <p className="section-copy">{messages.tools.body}</p>
        </div>
        <div className="tool-index-grid">
          {messages.tools.cards.map((card, index) => (
            <article className="panel" key={card.title}>
              <span className="stat-label">{card.label}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <div className="button-row">
                <TrackedLink className="button button-secondary" href={toolHrefs[index] ?? "/calculators/"} hrefLang={hrefLanguage(toolHrefs[index] ?? "/calculators/", locale)} eventName="cta_click" eventParams={{ cta_name: ["Browse calculators", "Browse exercises", "Browse workouts", "Browse nutrition resources"][index], cta_context: "home_tools" }}>
                  {card.action}
                </TrackedLink>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="logbook">
        <div className="section-head">
          <div className="eyebrow">Logbook</div>
          <h2 className="section-title">{messages.logbook.title}</h2>
          <p className="section-copy">{messages.logbook.intro}</p>
        </div>
        <div className="trust-layout">
          <article className="trust-feature">
            <h3>{messages.logbook.featureTitle}</h3>
            <p>{messages.logbook.featureBody}</p>
            <div className="button-row">
              <ProductCtaButtons product="Logbook" context="home_logbook" displayLabels={messages.storeButtons} />
              <TrackedLink className="button button-secondary" href={localizePathname("/logbook/", locale)} eventName="cta_click" eventParams={{ cta_name: "Explore Logbook", cta_context: "home_logbook", product: "Logbook" }}>
                {messages.logbook.explore}
              </TrackedLink>
            </div>
          </article>
          <div className="trust-list product-side-stack">
            <TrackedLink className="proof-card product-visual-card" href={localizePathname("/logbook/", locale)} eventName="cta_click" eventParams={{ cta_name: "View Logbook product preview", cta_context: "home_logbook", product: "Logbook" }}>
              <span className="proof-label">{messages.logbook.previewLabel}</span>
              <div className="product-visual-frame">
                <Image src="/blog-posts/how-many-calories-should-i-eat-to-lose-weight/featured.webp" alt={messages.logbook.previewAlt} width={1200} height={800} sizes="(max-width: 900px) 92vw, 38vw" />
              </div>
              <div className="product-caption"><strong>{messages.logbook.previewTitle}</strong><span>{messages.logbook.previewBody}</span></div>
            </TrackedLink>
            {messages.logbook.points.map((point) => <article className="trust-point" key={point.title}><strong>{point.title}</strong><p>{point.body}</p></article>)}
          </div>
        </div>
      </section>

      <section className="section" id="stagelab">
        <div className="section-head">
          <div className="eyebrow">StageLab</div>
          <h2 className="section-title">{messages.stagelab.title}</h2>
          <p className="section-copy">{messages.stagelab.intro}</p>
        </div>
        <div className="trust-layout">
          <article className="trust-feature">
            <h3>{messages.stagelab.featureTitle}</h3>
            <p>{messages.stagelab.featureBody}</p>
            <div className="button-row">
              <ProductCtaButtons product="StageLab" context="home_stagelab" displayLabels={messages.storeButtons} />
              <TrackedLink className="button button-secondary" href={localizePathname(getQuickAnalysisEntryHref("homepage"), locale)} eventName="cta_click" eventParams={{ cta_name: `Try Quick Analysis for ${QUICK_ANALYSIS_PRICE_DISPLAY}`, cta_context: "home_stagelab", product: "StageLab Quick Analysis", source: "homepage" }}>
                {interpolate(messages.stagelab.quickAnalysisCta, { price: QUICK_ANALYSIS_PRICE_DISPLAY })}
              </TrackedLink>
              <TrackedLink className="hero-text-link" href={localizePathname("/stagelab/", locale)} eventName="cta_click" eventParams={{ cta_name: "Explore StageLab", cta_context: "home_stagelab", product: "StageLab" }}>
                {messages.stagelab.explore}
              </TrackedLink>
            </div>
          </article>
          <div className="trust-list product-side-stack">
            <TrackedLink className="proof-card product-visual-card" href={localizePathname("/stagelab/", locale)} eventName="cta_click" eventParams={{ cta_name: "View StageLab product preview", cta_context: "home_stagelab", product: "StageLab" }}>
              <span className="proof-label">{messages.stagelab.previewLabel}</span>
              <div className="product-visual-frame product-visual-frame-tall">
                <Image src="/blog-posts/mens-physique-classic-physique-prep-12-weeks-out/recommendation.png" alt={messages.stagelab.previewAlt} width={296} height={640} />
              </div>
              <div className="product-caption"><strong>{messages.stagelab.previewTitle}</strong><span>{messages.stagelab.previewBody}</span></div>
            </TrackedLink>
            {messages.stagelab.points.map((point) => <article className="trust-point" key={point.title}><strong>{point.title}</strong><p>{point.body}</p></article>)}
          </div>
        </div>
      </section>

      <section className="section" id="marketplace">
        <div className="section-head">
          <div className="eyebrow">{messages.marketplace.eyebrow}</div>
          <h2 className="section-title">{messages.marketplace.title}</h2>
          <p className="section-copy">{messages.marketplace.body}</p>
        </div>
        <div className="landing-hero">
          <div className="hero-copy marketplace-copy">
            <p className="marketplace-intro">{messages.marketplace.intro}</p>
            <div className="hero-proof marketplace-grid" aria-label={messages.marketplace.audienceLabel}>
              <article className="proof-card"><span className="proof-label">{messages.marketplace.clientLabel}</span><div className="proof-value">{messages.marketplace.clientTitle}</div><p className="proof-copy">{messages.marketplace.clientBody}</p></article>
              <article className="proof-card"><span className="proof-label">{messages.marketplace.professionalLabel}</span><div className="proof-value">{messages.marketplace.professionalTitle}</div><p className="proof-copy">{messages.marketplace.professionalBody}</p></article>
            </div>
            <div className="hero-actions">
              <TrackedLink className="btn btn-primary" href="/professionals/" hrefLang={hrefLanguage("/professionals/", locale)} eventName="cta_click" eventParams={{ cta_name: "Find your match", cta_context: "home_marketplace_section", product: "Elevare" }}>{messages.marketplace.browseCta}</TrackedLink>
              <TrackedLink className="button button-secondary" href="/account/professional-profile/" hrefLang={hrefLanguage("/account/professional-profile/", locale)} eventName="cta_click" eventParams={{ cta_name: "Join as a Pro", cta_context: "home_marketplace_section", product: "Elevare" }}>{messages.marketplace.joinCta}</TrackedLink>
            </div>
          </div>
          <aside className="waitlist-card marketplace-side-card">
            <div className="card-kicker">{messages.marketplace.snapshotLabel}</div>
            <h2>{messages.marketplace.snapshotTitle}</h2>
            <p>{messages.marketplace.snapshotBody}</p>
            <div className="micro-trust marketplace-category-list">
              {topCategories.map((category) => {
                const translated = categoryTranslations[category.slug];
                return (
                  <TrackedLink key={category.slug} className="proof-card proof-card-link compact-category-card" href={`/professionals/${category.slug}/`} hrefLang={hrefLanguage(`/professionals/${category.slug}/`, locale)} eventName="professional_category_selected" eventParams={{ source_page: "home_marketplace", category: category.slug }}>
                    <span className="proof-label">{translated?.label ?? category.label}</span>
                    <p className="proof-copy">{translated?.description ?? category.shortDescription}</p>
                    <span className="proof-action">{messages.marketplace.categoryAction}</span>
                  </TrackedLink>
                );
              })}
            </div>
            <p className="fine-print">
              {marketplaceSocialProof
                ? interpolate(messages.marketplace.socialProof, { count: marketplaceSocialProof })
                : messages.marketplace.socialProofFallback}
            </p>
          </aside>
        </div>
      </section>

      <section className="section" id="insights">
        <div className="section-head">
          <div className="eyebrow">{messages.insights.eyebrow}</div>
          <h2 className="section-title">{messages.insights.title}</h2>
          <p className="section-copy">{messages.insights.body}</p>
        </div>
        <div className="blog-grid">
          {latestPosts.map((post) => <BlogCard key={post.slug} post={post} sourcePage={`home_${locale}`} locale={locale} readLabel={messages.insights.readArticle} />)}
        </div>
        <div className="button-row">
          <TrackedLink className="button button-secondary" href="/blog/" hrefLang={hrefLanguage("/blog/", locale)} eventName="cta_click" eventParams={{ cta_name: "Browse the blog", cta_context: "home_insights" }}>{messages.insights.cta}</TrackedLink>
        </div>
      </section>
    </div>
  );
}
