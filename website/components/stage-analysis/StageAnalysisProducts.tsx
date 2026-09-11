import type { Locale } from "@/lib/i18n/config";
import type { QuickAnalysisSource } from "@/lib/quick-analysis-attribution";
import { analysisDiscoveryCopy } from "@/lib/stage-analysis-discovery";
import { STAGE_ANALYSIS_PRODUCTS } from "@/lib/stage-analysis";
import { StageAnalysisCard } from "./StageAnalysisCard";

export function StageAnalysisProducts({ locale = "en", source = "stagelab", id = "digital-analyses" }: {
  locale?: Locale; source?: QuickAnalysisSource; id?: string;
}) {
  const messages = analysisDiscoveryCopy[locale] ?? analysisDiscoveryCopy.en;
  return (
    <section className="section stage-analysis-products" id={id} aria-labelledby={`${id}-title`}>
      <div className="section-head">
        <div className="eyebrow">{messages.audience}</div>
        <h2 className="section-title" id={`${id}-title`}>{messages.title}</h2>
        <p className="section-copy">{messages.body}</p>
      </div>
      <div className="stage-analysis-product-grid">
        {STAGE_ANALYSIS_PRODUCTS.map((product) => <StageAnalysisCard key={product} product={product} locale={locale} source={source} />)}
      </div>
      <p className="fine-print analysis-terms">{messages.terms}</p>
    </section>
  );
}
