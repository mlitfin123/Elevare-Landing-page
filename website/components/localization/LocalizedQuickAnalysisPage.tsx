import { Suspense } from "react";
import { QuickAnalysisCheckout } from "@/components/quick-analysis/QuickAnalysisCheckout";
import { QuickAnalysisReturnLink } from "@/components/quick-analysis/QuickAnalysisReturnLink";
import { StructuredData } from "@/components/StructuredData";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import type { QuickAnalysisMessages } from "@/lib/i18n/quick-analysis-types";
import { QUICK_ANALYSIS_PRICE_VALUE } from "@/lib/quick-analysis";
import { absoluteUrl } from "@/lib/site";

export function LocalizedQuickAnalysisPage({ locale, messages }: { locale: Locale; messages: QuickAnalysisMessages }) {
  const pathname = localizePathname("/stagelab/quick-analysis/", locale);
  const { landing } = messages;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${absoluteUrl(pathname)}#product`,
      name: "StageLab Quick Analysis",
      description: messages.structuredDescription,
      inLanguage: locale,
      brand: { "@type": "Brand", name: "StageLab" },
      url: absoluteUrl(pathname),
      offers: { "@type": "Offer", price: QUICK_ANALYSIS_PRICE_VALUE.toFixed(2), priceCurrency: "USD", availability: "https://schema.org/InStock", url: absoluteUrl(pathname) },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: locale,
      mainEntity: landing.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
    },
  ];

  return (
    <div className="container">
      <StructuredData data={structuredData} />
      <section className="hero quick-analysis-hero">
        <div>
          <div className="eyebrow">StageLab Quick Analysis</div>
          <h1>{landing.heroTitle}</h1>
          <p>{landing.heroBody}</p>
          <div className="quick-analysis-badges" aria-label={landing.productDetailsLabel}>
            <span>{landing.oneTimeBadge}</span><span>{landing.noSubscription}</span><span>{landing.noAccount}</span><span>{landing.photosNotStored}</span>
          </div>
          <QuickAnalysisReturnLink locale={locale} messages={messages.returnLink} />
        </div>
        <div className="quick-analysis-hero-card">
          <span className="stat-label">{landing.reportCanAssess}</span>
          <ul>{landing.reportItems.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </section>

      <section className="section quick-analysis-intro-grid">
        {landing.introCards.map((card) => <article className="panel" key={card.title}><span className="stat-label">{card.label}</span><h2>{card.title}</h2><p>{card.body}</p></article>)}
      </section>

      <section className="section quick-analysis-demo" aria-labelledby="quick-analysis-demo-heading">
        <div className="quick-analysis-demo-copy"><h2 id="quick-analysis-demo-heading">{landing.demoTitle}</h2><p>{landing.demoBody}</p></div>
        <div className="quick-analysis-video-frame">
          <iframe src="https://www.youtube-nocookie.com/embed/BbAHsUA-yH0" title={landing.demoIframeTitle} loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        </div>
      </section>

      <section className="section quick-analysis-checkout-layout" id="start-analysis">
        <div className="quick-analysis-checkout-copy">
          <div className="eyebrow">{landing.beforeCheckout}</div>
          <h2>{landing.uploadAfterCheckout}</h2>
          <p>{landing.uploadExplanation}</p>
          <div className="quick-analysis-privacy-note"><strong>{landing.photoPrivacyTitle}</strong><span>{landing.photoPrivacyBody}</span></div>
          <div className="quick-analysis-privacy-note"><strong>{landing.accessTitle}</strong><span>{landing.accessBody}</span></div>
        </div>
        <Suspense fallback={<div className="panel"><p>{landing.preparingCheckout}</p></div>}><QuickAnalysisCheckout locale={locale} messages={messages.checkout} /></Suspense>
      </section>

      <section className="section" aria-labelledby="quick-analysis-faqs">
        <div className="section-heading"><div><div className="eyebrow">{landing.faqEyebrow}</div><h2 id="quick-analysis-faqs">{landing.faqTitle}</h2></div></div>
        <div className="quick-analysis-faq-list">{landing.faqs.map((faq) => <details className="quick-analysis-faq panel" key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>
      </section>
    </div>
  );
}
