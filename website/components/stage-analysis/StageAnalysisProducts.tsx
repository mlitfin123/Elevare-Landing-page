import type { Locale } from "@/lib/i18n/config";
import type { QuickAnalysisSource } from "@/lib/quick-analysis-attribution";
import { analysisDiscoveryCopy } from "@/lib/stage-analysis-discovery";
import { STAGE_ANALYSIS_PRODUCTS } from "@/lib/stage-analysis";
import { StageAnalysisCard } from "./StageAnalysisCard";

export function StageAnalysisProducts({ locale = "en", source = "stagelab", id = "digital-analyses", presentation = "analysis" }: {
  locale?: Locale;
  source?: QuickAnalysisSource;
  id?: string;
  presentation?: "analysis" | "standalone-reports";
}) {
  const messages = analysisDiscoveryCopy[locale] ?? analysisDiscoveryCopy.en;
  const standalone = presentation === "standalone-reports";
  return (
    <section className="section stage-analysis-products" id={id} aria-labelledby={`${id}-title`}>
      <div className="section-head">
        <div className="eyebrow">{standalone ? messages.reportAudience : messages.audience}</div>
        <h2 className="section-title" id={`${id}-title`}>{standalone ? messages.reportTitle : messages.title}</h2>
        <p className="section-copy">{standalone ? messages.reportBody : messages.body}</p>
      </div>
      <div className="stage-analysis-product-grid">
        {STAGE_ANALYSIS_PRODUCTS.map((product) => <StageAnalysisCard key={product} product={product} locale={locale} source={source} />)}
      </div>
      <p className="fine-print analysis-terms">{standalone ? messages.reportTerms : messages.terms}</p>
    </section>
  );
}
