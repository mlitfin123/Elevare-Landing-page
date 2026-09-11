import { AnalysisExampleReport } from "@/components/stage-analysis/AnalysisExampleReport";
import { analysisDiscoveryCopy } from "@/lib/stage-analysis-discovery";
import { resolveQuickAnalysisGenerationLocale } from "@/lib/quick-analysis-locale";
import { Suspense } from "react";
import { StageAnalysisCheckout } from "@/components/stage-analysis/StageAnalysisCheckout";
import { StageAnalysisViewTracker } from "@/components/stage-analysis/StageAnalysisViewTracker";
import { StructuredData } from "@/components/StructuredData";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import type { StageAnalysisMessages } from "@/lib/i18n/stage-analysis-messages";
import {
  STAGE_ANALYSIS_PRODUCT_CONFIG,
  formatStageAnalysisPrice,
  type PaidStageAnalysisProduct,
} from "@/lib/stage-analysis";
import { absoluteUrl } from "@/lib/site";

export function LocalizedStageAnalysisPage({
  product,
  locale,
  messages,
}: {
  product: PaidStageAnalysisProduct;
  locale: Locale;
  messages: StageAnalysisMessages;
}) {
  const landing = messages.landing[product];
  const route = product === "posing_analysis" ? "posing-analysis" : "complete-stage-analysis";
  const pathname = localizePathname(`/stagelab/${route}/`, locale);
  const price = formatStageAnalysisPrice(product);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${absoluteUrl(pathname)}#product`,
      name: STAGE_ANALYSIS_PRODUCT_CONFIG[product].label,
      description: messages.seo[product].description,
      inLanguage: locale,
      brand: { "@type": "Brand", name: "StageLab" },
      url: absoluteUrl(pathname),
      offers: {
        "@type": "Offer",
        price: (STAGE_ANALYSIS_PRODUCT_CONFIG[product].priceCents / 100).toFixed(2),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: absoluteUrl(pathname),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: locale,
      mainEntity: landing.faq.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return (
    <div className="container">
      <StructuredData data={structuredData} />
      <StageAnalysisViewTracker product={product} />
      <section className="hero quick-analysis-hero stage-analysis-hero">
        <div>
          <div className="eyebrow">{landing.eyebrow}</div>
          <h1>{landing.title}</h1>
          <p>{landing.body}</p>
          <div className="quick-analysis-badges">
            <span>{price} · {analysisDiscoveryCopy[locale].oneTime}</span>
            <span>{messages.result.privacyTitle}</span>
          </div>
        </div>
        <div className="quick-analysis-hero-card">
          <span className="stat-label">StageLab</span>
          <ul>{landing.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
        </div>
      </section>

      <AnalysisExampleReport product={product} locale={locale} />
      {resolveQuickAnalysisGenerationLocale(locale) !== locale ? <p className="panel fine-print" role="status">{analysisDiscoveryCopy[locale].languageFallback}</p> : null}

      <section className="section quick-analysis-checkout-layout" id="start-analysis">
        <div className="quick-analysis-checkout-copy">
          <div className="eyebrow">{landing.eyebrow}</div>
          <h2>{landing.checkoutTitle}</h2>
          <p>{landing.checkoutBody}</p>
          <div className="quick-analysis-privacy-note">
            <strong>{messages.result.privacyTitle}</strong>
            <span>{messages.result.privacyBody}</span>
          </div>
        </div>
        <Suspense fallback={<div className="panel"><p>{messages.checkout.loading}</p></div>}>
          <StageAnalysisCheckout product={product} locale={locale} messages={messages.checkout} />
        </Suspense>
      </section>

      <section className="section" aria-labelledby={`${route}-faqs`}>
        <div className="section-heading">
          <div><div className="eyebrow">StageLab</div><h2 id={`${route}-faqs`}>FAQ</h2></div>
        </div>
        <div className="quick-analysis-faq-list">
          {landing.faq.map((faq) => <details className="quick-analysis-faq panel" key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
        </div>
      </section>
    </div>
  );
}
