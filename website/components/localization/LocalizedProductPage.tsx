import Image from "next/image";
import { Callout } from "@/components/Callout";
import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import type { ProductPageMessages } from "@/lib/i18n/marketing-types";
import { interpolate } from "@/lib/i18n/translate";
import { QUICK_ANALYSIS_PRICE_DISPLAY } from "@/lib/quick-analysis";
import { getQuickAnalysisEntryHref } from "@/lib/quick-analysis-attribution";
import { absoluteUrl, productConfig } from "@/lib/site";

type LocalizedProduct = "logbook" | "stagelab";

const productDetails = {
  logbook: {
    name: "Logbook" as const,
    logo: "/logbook-logo.png",
    logoClass: "product-hero-logo product-hero-logo-square",
    visual: "/blog-posts/how-many-calories-should-i-eat-to-lose-weight/featured.webp",
    visualWidth: 1200,
    visualHeight: 800,
  },
  stagelab: {
    name: "StageLab" as const,
    logo: "/stagelab-logo.webp",
    logoClass: "product-hero-logo",
    visual: "/blog-posts/mens-physique-classic-physique-prep-12-weeks-out/recommendation.png",
    visualWidth: 296,
    visualHeight: 640,
  },
};

function buildLocalizedProductStructuredData(locale: Locale, product: LocalizedProduct, messages: ProductPageMessages) {
  const details = productDetails[product];
  const localizedPath = localizePathname(`/${product}/`, locale);
  const storeLinks = productConfig[details.name].storeLinks?.map((link) => link.href) ?? [];

  return [
    {
      "@context": "https://schema.org",
      "@type": "MobileApplication",
      "@id": `${absoluteUrl(localizedPath)}#app`,
      name: details.name,
      description: messages.structuredDescription,
      inLanguage: locale,
      applicationCategory: "HealthApplication",
      operatingSystem: "iOS, Android",
      url: absoluteUrl(localizedPath),
      image: absoluteUrl(details.logo),
      downloadUrl: storeLinks,
      sameAs: storeLinks,
      publisher: { "@id": `${absoluteUrl("/")}#organization` },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: locale,
      mainEntity: messages.faq.items.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];
}

export function LocalizedProductPage({ locale, product, messages }: { locale: Locale; product: LocalizedProduct; messages: ProductPageMessages }) {
  const details = productDetails[product];
  const isLogbook = product === "logbook";

  return (
    <div className="container">
      <StructuredData data={buildLocalizedProductStructuredData(locale, product, messages)} />
      <section className="hero product-hero">
        <div className="product-hero-copy">
          <div className="eyebrow">{messages.hero.eyebrow}</div>
          <h1>{messages.hero.title}</h1>
          <p>{messages.hero.body}</p>
          <div className="button-row">
            <ProductCtaButtons product={details.name} context={`${product}_hero`} displayLabels={messages.storeButtons} />
            {isLogbook ? (
              <TrackedLink className="button button-secondary" href="/calculators/" hrefLang={locale === "en" ? undefined : "en"} eventName="cta_click" eventParams={{ cta_name: "Explore free calculators", cta_context: "logbook_hero", product: "Logbook" }}>{messages.hero.secondaryCta}</TrackedLink>
            ) : (
              <>
                <TrackedLink className="button button-secondary" href={localizePathname(getQuickAnalysisEntryHref("stagelab"), locale)} eventName="cta_click" eventParams={{ cta_name: `Try Quick Analysis for ${QUICK_ANALYSIS_PRICE_DISPLAY}`, cta_context: "stagelab_hero", product: "StageLab Quick Analysis", source: "stagelab" }}>
                  {interpolate(messages.hero.secondaryCta, { price: QUICK_ANALYSIS_PRICE_DISPLAY })}
                </TrackedLink>
                {messages.hero.tertiaryCta ? <TrackedLink className="hero-text-link" href="/blog/category/prep-files/" hrefLang={locale === "en" ? undefined : "en"} eventName="cta_click" eventParams={{ cta_name: "Read prep files", cta_context: "stagelab_hero", product: "StageLab" }}>{messages.hero.tertiaryCta}</TrackedLink> : null}
              </>
            )}
          </div>
        </div>
        <div className="product-hero-visual"><div className="product-hero-logo-frame"><Image src={details.logo} alt={messages.hero.logoAlt} width={isLogbook ? 360 : 720} height={isLogbook ? 360 : 720} sizes="(max-width: 720px) 240px, 360px" className={details.logoClass} priority /></div></div>
      </section>

      {isLogbook && messages.demo ? (
        <section className="section logbook-demo" aria-labelledby={`logbook-demo-${locale}`}>
          <div className="logbook-demo-copy"><h2 id={`logbook-demo-${locale}`}>{messages.demo.title}</h2><p>{messages.demo.body}</p></div>
          <div className="logbook-video-frame"><iframe src="https://www.youtube-nocookie.com/embed/Stqu2-1rN_8" title={messages.demo.iframeTitle} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
        </section>
      ) : null}

      <section className="section"><div className="grid-3">{messages.summaryCards.map((card) => <article className="panel" key={card.title}><span className="stat-label">{card.label}</span><h3>{card.title}</h3><p>{card.body}</p></article>)}</div></section>

      <section className="section trust-layout">
        <div className="trust-list">
          <article className="panel"><div className="eyebrow">{messages.overview.eyebrow}</div><h2>{messages.overview.title}</h2>{messages.overview.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</article>
          <article className="panel"><h2>{messages.overview.secondaryTitle}</h2><p>{messages.overview.secondaryBody}</p></article>
        </div>
        <figure className="product-visual-card panel">
          <div className={`product-visual-frame${isLogbook ? "" : " product-visual-frame-tall"}`}><Image src={details.visual} alt={messages.visual.alt} width={details.visualWidth} height={details.visualHeight} sizes={isLogbook ? "(max-width: 900px) 92vw, 38vw" : "(max-width: 720px) 72vw, 230px"} loading="lazy" /></div>
          <figcaption className="product-caption"><strong>{messages.visual.title}</strong><span>{messages.visual.body}</span></figcaption>
        </figure>
      </section>

      <section className="section"><div className="section-heading"><div><div className="eyebrow">{messages.features.eyebrow}</div><h2>{messages.features.title}</h2></div></div><div className="grid-3">{messages.features.cards.map((card) => <article className="panel" key={card.title}><h3>{card.title}</h3><p>{card.body}</p></article>)}</div></section>
      <section className="section"><div className="section-heading"><div><div className="eyebrow">{messages.steps.eyebrow}</div><h2>{messages.steps.title}</h2></div></div><div className="grid-3">{messages.steps.cards.map((card, index) => <article className="panel" key={card.title}><span className="stat-label">{String(index + 1).padStart(2, "0")}</span><h3>{card.title}</h3><p>{card.body}</p></article>)}</div></section>

      <Callout title={messages.callout.title} label={messages.callout.label}>
        <p>{messages.callout.body}</p>
        {isLogbook && (messages.callout.firstCta || messages.callout.secondCta) ? <div className="hero-actions">{messages.callout.firstCta ? <TrackedLink className="button button-secondary" href="/exercises/" hrefLang={locale === "en" ? undefined : "en"} eventName="cta_click" eventParams={{ cta_name: "Browse exercises", cta_context: "logbook_callout", product: "Logbook" }}>{messages.callout.firstCta}</TrackedLink> : null}{messages.callout.secondCta ? <TrackedLink className="button button-secondary" href="/workouts/" hrefLang={locale === "en" ? undefined : "en"} eventName="cta_click" eventParams={{ cta_name: "Browse workout templates", cta_context: "logbook_callout", product: "Logbook" }}>{messages.callout.secondCta}</TrackedLink> : null}</div> : null}
      </Callout>

      <section className="section" aria-labelledby={`${product}-faqs-${locale}`}><div className="section-heading"><div><div className="eyebrow">{messages.faq.eyebrow}</div><h2 id={`${product}-faqs-${locale}`}>{messages.faq.title}</h2></div></div><div className="tool-faq-grid">{messages.faq.items.map((faq) => <article className="tool-faq-card panel" key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></article>)}</div></section>
      <section className="section final-card panel"><div><div className="eyebrow">{messages.final.eyebrow}</div><h2>{messages.final.title}</h2></div><ProductCtaButtons product={details.name} context={`${product}_final`} displayLabels={messages.storeButtons} /></section>
    </div>
  );
}
