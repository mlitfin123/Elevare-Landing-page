import Image from "next/image";
import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import { StageAnalysisProducts } from "@/components/stage-analysis/StageAnalysisProducts";
import { StageLabMethodology } from "@/components/stage-analysis/StageLabMethodology";
import { StageLabLandingVideo } from "@/components/stagelab/StageLabLandingVideo";
import { localizePathname, type Locale } from "@/lib/i18n/config";
import { getStageLabLandingMessages, STAGELAB_LANDING_FEATURES } from "@/lib/stagelab-landing";
import { STAGELAB_LANDING_MEDIA, type StageLabLandingImage } from "@/lib/stagelab-landing-media";
import { absoluteUrl, productConfig } from "@/lib/site";

function buildStageLabStructuredData(locale: Locale) {
  const copy = getStageLabLandingMessages(locale);
  const localizedPath = localizePathname("/stagelab/", locale);
  const storeLinks = productConfig.StageLab.storeLinks?.map((link) => link.href) ?? [];

  return [
    {
      "@context": "https://schema.org",
      "@type": "MobileApplication",
      "@id": `${absoluteUrl(localizedPath)}#app`,
      name: "StageLab",
      description: copy.structuredDescription,
      inLanguage: locale,
      applicationCategory: "HealthApplication",
      operatingSystem: "iOS, Android",
      url: absoluteUrl(localizedPath),
      image: absoluteUrl("/stagelab-logo.webp"),
      downloadUrl: storeLinks,
      sameAs: storeLinks,
      publisher: { "@id": `${absoluteUrl("/")}#organization` },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: locale,
      mainEntity: copy.faq.items.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];
}

function Screenshot({
  media,
  alt,
  title,
  caption,
  languageNote,
  openImage,
  className = "",
  priority = false,
}: {
  media: StageLabLandingImage;
  alt: string;
  title?: string;
  caption: string;
  languageNote?: string;
  openImage: string;
  className?: string;
  priority?: boolean;
}) {
  if (!media.enabled) return null;

  return (
    <figure className={`stagelab-screenshot ${className}`.trim()}>
      <a
        className="stagelab-screenshot-link"
        href={media.src}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${openImage}: ${title ?? caption}`}
      >
        <Image
          src={media.src}
          alt={alt}
          width={media.width}
          height={media.height}
          sizes="(max-width: 720px) 84vw, 300px"
          priority={priority}
          loading={priority ? undefined : "lazy"}
        />
      </a>
      <figcaption>
        {title ? <strong>{title}</strong> : null}
        <span>{caption}</span>
        {languageNote ? <small>{languageNote}</small> : null}
      </figcaption>
    </figure>
  );
}

export function StageLabLandingPage({ locale = "en" }: { locale?: Locale }) {
  const copy = getStageLabLandingMessages(locale);
  const demoMedia = ["physiqueReview", "posingReview", "weeklyRecommendation"] as const;

  return (
    <div className="container stagelab-product-page">
      <StructuredData data={buildStageLabStructuredData(locale)} />

      <section className="hero stagelab-product-hero">
        <div className="stagelab-product-hero-copy">
          <div className="stagelab-product-lockup" aria-hidden="true">
            <Image src="/stagelab-logo.webp" alt="" width={58} height={58} priority />
            <span>StageLab</span>
          </div>
          <div className="eyebrow">{copy.hero.eyebrow}</div>
          <h1>{copy.hero.title}</h1>
          <p>{copy.hero.body}</p>
          <p className="stagelab-product-support">{copy.hero.support}</p>
          <div className="button-row">
            <ProductCtaButtons product="StageLab" context="stagelab_hero" displayLabels={copy.storeButtons} />
          </div>
          <nav className="stagelab-product-hero-links" aria-label={copy.hero.navLabel}>
            <TrackedLink
              href="#digital-analyses"
              eventName="cta_click"
              eventParams={{ cta_name: copy.hero.reportLink, cta_context: "stagelab_hero_reports", product: "StageLab" }}
            >
              {copy.hero.reportLink}
            </TrackedLink>
            {STAGELAB_LANDING_MEDIA.demoVideo.enabled ? (
              <TrackedLink
                href="#stagelab-demo"
                eventName="cta_click"
                eventParams={{ cta_name: copy.hero.demoLink, cta_context: "stagelab_hero_demo", product: "StageLab" }}
              >
                {copy.hero.demoLink}
              </TrackedLink>
            ) : null}
          </nav>
        </div>

        <Screenshot
          media={STAGELAB_LANDING_MEDIA.hero}
          alt={copy.hero.mediaAlt}
          caption={copy.hero.mediaCaption}
          openImage={copy.demo.openImage}
          className="stagelab-hero-screenshot"
          priority
        />
      </section>

      <section className="section stagelab-product-demo" id="stagelab-demo" aria-labelledby="stagelab-demo-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">{copy.demo.eyebrow}</div>
            <h2 id="stagelab-demo-title">{copy.demo.title}</h2>
            <p>{copy.demo.body}</p>
          </div>
        </div>
        <div className="stagelab-demo-layout">
          {STAGELAB_LANDING_MEDIA.demoVideo.enabled ? (
            <article className="panel stagelab-demo-video-card">
              <div>
                <span className="stat-label">{copy.demo.languageNote}</span>
                <h3>{copy.demo.videoTitle}</h3>
                <p>{copy.demo.videoBody}</p>
              </div>
              <StageLabLandingVideo locale={locale} playLabel={copy.demo.playLabel} iframeTitle={copy.demo.iframeTitle} />
            </article>
          ) : null}
          <div className="stagelab-demo-screens">
            {demoMedia.map((key) => {
              const item = copy.demo.images[key];
              return (
                <Screenshot
                  key={key}
                  media={STAGELAB_LANDING_MEDIA[key]}
                  alt={item.alt}
                  title={item.title}
                  caption={item.caption}
                  languageNote={copy.demo.languageNote}
                  openImage={copy.demo.openImage}
                />
              );
            })}
          </div>
        </div>
      </section>

      <section className="section stagelab-benefits" aria-labelledby="stagelab-benefits-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">{copy.benefits.eyebrow}</div>
            <h2 id="stagelab-benefits-title">{copy.benefits.title}</h2>
            <p>{copy.benefits.intro}</p>
          </div>
        </div>

        <article className="panel stagelab-coach-benefit stagelab-dashboard-benefit">
          <div>
            <span className="stat-label">{copy.benefits.items.daily.label}</span>
            <h3>{copy.benefits.items.daily.title}</h3>
            <p>{copy.benefits.items.daily.body}</p>
          </div>
          <Screenshot
            media={STAGELAB_LANDING_MEDIA.athleteDashboard}
            alt={copy.benefits.athleteDashboardMediaAlt}
            caption={copy.benefits.athleteDashboardMediaCaption}
            openImage={copy.demo.openImage}
          />
        </article>

        <article className="panel stagelab-coach-benefit stagelab-progress-benefit">
          <div>
            <span className="stat-label">{copy.benefits.items.progress.label}</span>
            <h3>{copy.benefits.items.progress.title}</h3>
            <p>{copy.benefits.items.progress.body}</p>
          </div>
          <Screenshot
            media={STAGELAB_LANDING_MEDIA.progressComparison}
            alt={copy.benefits.progressMediaAlt}
            caption={copy.benefits.progressMediaCaption}
            openImage={copy.demo.openImage}
          />
        </article>

        <div className="stagelab-benefit-grid">
          {STAGELAB_LANDING_FEATURES.filter((key) => key !== "coaches" && key !== "roadmap" && key !== "progress" && key !== "daily").map((key) => {
            const item = copy.benefits.items[key];
            return (
              <article className="panel stagelab-benefit-card" key={key}>
                <span className="stat-label">{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            );
          })}
        </div>

        <article className="panel stagelab-coach-benefit stagelab-roadmap-benefit">
          <div>
            <span className="stat-label">{copy.benefits.items.roadmap.label}</span>
            <h3>{copy.benefits.items.roadmap.title}</h3>
            <p>{copy.benefits.items.roadmap.body}</p>
          </div>
          <Screenshot
            media={STAGELAB_LANDING_MEDIA.showDayPlan}
            alt={copy.benefits.showDayMediaAlt}
            caption={copy.benefits.showDayMediaCaption}
            openImage={copy.demo.openImage}
          />
        </article>

        <article className="panel stagelab-coach-benefit">
          <div>
            <span className="stat-label">{copy.benefits.items.coaches.label}</span>
            <h3>{copy.benefits.items.coaches.title}</h3>
            <p>{copy.benefits.items.coaches.body}</p>
            <TrackedLink
              className="button button-secondary"
              href={localizePathname("/stagelab/coaches/start/", locale)}
              eventName="cta_click"
              eventParams={{ cta_name: copy.benefits.coachCta, cta_context: "stagelab_coach_feature", product: "StageLab Coach Pro" }}
            >
              {copy.benefits.coachCta}
            </TrackedLink>
          </div>
          <Screenshot
            media={STAGELAB_LANDING_MEDIA.coachDashboard}
            alt={copy.benefits.coachMediaAlt}
            caption={copy.benefits.coachMediaCaption}
            openImage={copy.demo.openImage}
          />
        </article>

        <p className="fine-print stagelab-access-note">{copy.benefits.access}</p>
      </section>

      <StageAnalysisProducts locale={locale} source="stagelab" presentation="standalone-reports" />

      <StageLabMethodology locale={locale} collapsed />

      <section className="section" aria-labelledby={`stagelab-faqs-${locale}`}>
        <div className="section-heading">
          <div>
            <div className="eyebrow">{copy.faq.eyebrow}</div>
            <h2 id={`stagelab-faqs-${locale}`}>{copy.faq.title}</h2>
          </div>
        </div>
        <div className="quick-analysis-faq-list stagelab-faq-list">
          {copy.faq.items.map((faq) => (
            <details className="quick-analysis-faq panel" key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section final-card panel stagelab-product-final">
        <div>
          <div className="eyebrow">{copy.final.eyebrow}</div>
          <h2>{copy.final.title}</h2>
          <p>{copy.final.body}</p>
          <p className="fine-print">{copy.final.access}</p>
        </div>
        <ProductCtaButtons product="StageLab" context="stagelab_final" displayLabels={copy.storeButtons} />
      </section>
    </div>
  );
}
