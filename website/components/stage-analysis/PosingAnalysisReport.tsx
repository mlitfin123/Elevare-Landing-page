import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { TrackedLink } from "@/components/TrackedLink";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import type { StageAnalysisMessages } from "@/lib/i18n/stage-analysis-messages";
import type { PaidStageAnalysisProduct, PosingAnalysisResult } from "@/lib/stage-analysis";

const qualityLabels: Record<Locale, Record<PosingAnalysisResult["analysis_quality"], string>> = {
  en: { low: "Low", medium: "Medium", high: "High", unusable: "Unusable" },
  "es-419": { low: "Baja", medium: "Media", high: "Alta", unusable: "No utilizable" },
  "pt-BR": { low: "Baixa", medium: "Média", high: "Alta", unusable: "Inutilizável" },
};

const usabilityLabels: Record<Locale, Record<PosingAnalysisResult["video_usability_status"], string>> = {
  en: { usable: "Usable", limited: "Limited", unusable: "Unusable" },
  "es-419": { usable: "Utilizable", limited: "Limitada", unusable: "No utilizable" },
  "pt-BR": { usable: "Utilizável", limited: "Limitada", unusable: "Inutilizável" },
};

function Items({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{empty}</p>;
}

export function PosingAnalysisReport({
  result,
  product,
  locale,
  messages,
}: {
  result: PosingAnalysisResult;
  product: PaidStageAnalysisProduct;
  locale: Locale;
  messages: StageAnalysisMessages["result"];
}) {
  return (
    <section className="quick-analysis-report posing-analysis-report">
      <article className="quick-analysis-report-hero panel">
        <div><div className="eyebrow">{messages.poweredBy}</div><h1>{messages.reportTitle}</h1><p>{result.score_explanation}</p></div>
        <div className="quick-analysis-condition-score"><span>{messages.score}</span><strong>{result.overall_stage_lab_posing_score == null ? messages.notScored : `${result.overall_stage_lab_posing_score}/100`}</strong><small>{qualityLabels[locale][result.analysis_quality]}</small></div>
      </article>

      <div className="quick-analysis-snapshot-grid">
        <article className="panel"><span className="stat-label">{messages.quality}</span><strong className="quick-analysis-snapshot-value">{qualityLabels[locale][result.analysis_quality]}</strong></article>
        <article className="panel"><span className="stat-label">{messages.usability}</span><strong className="quick-analysis-snapshot-value">{usabilityLabels[locale][result.video_usability_status]}</strong><small>{result.video_usability_reason}</small></article>
      </div>

      <article className="panel quick-analysis-judge-panel"><div className="eyebrow">{messages.biggestOpportunity}</div><h2>{result.biggest_opportunity}</h2></article>
      <div className="grid-3">
        <article className="panel"><h2>{messages.strengths}</h2><Items items={result.overall_strengths} empty={messages.notScored} /></article>
        <article className="panel"><h2>{messages.transitions}</h2><Items items={result.transition_observations} empty={messages.notScored} /></article>
        <article className="panel"><h2>{messages.consistency}</h2><Items items={result.consistency_observations} empty={messages.notScored} /></article>
      </div>

      {result.highest_priority_corrections.length ? <section><div className="section-heading"><div><div className="eyebrow">StageLab</div><h2>{messages.corrections}</h2></div></div><div className="grid-3">{result.highest_priority_corrections.map((item) => <article className="panel" key={`${item.title}-${item.visible_evidence}`}><h3>{item.title}</h3><p><strong>{messages.visibleEvidence}:</strong> {item.visible_evidence}</p><p><strong>{messages.tryThis}:</strong> {item.try_this}</p></article>)}</div></section> : null}

      {result.poses_detected.length ? <section><div className="section-heading"><div><div className="eyebrow">{messages.poweredBy}</div><h2>{messages.detectedPoses}</h2></div></div><div className="posing-analysis-pose-grid">{result.poses_detected.map((pose, index) => <article className="panel posing-analysis-pose" key={`${pose.pose_name}-${index}`}><div className="posing-analysis-pose-head"><h3>{pose.pose_name}</h3><strong>{pose.pose_score == null ? messages.notScored : `${pose.pose_score}/100`}</strong></div><p><strong>{messages.strongestAspect}:</strong> {pose.strongest_aspect}</p><p><strong>{messages.biggestIssue}:</strong> {pose.biggest_issue}</p><p><strong>{messages.coachingCue}:</strong> {pose.coaching_cue}</p>{pose.component_scores.length ? <div><span className="stat-label">{messages.components}</span><ul className="posing-analysis-components">{pose.component_scores.map((component) => <li key={component.label}><span>{component.label}</span><strong>{component.score == null ? messages.notScored : `${component.score}/100`}</strong><small>{component.note}</small></li>)}</ul></div> : null}</article>)}</div></section> : null}

      <article className="panel"><h2>{messages.nextFocus}</h2><Items items={result.athlete_next_focus} empty={messages.notScored} /></article>
      <article className="quick-analysis-limitations panel"><div><div className="eyebrow">{messages.limitations}</div><p>{result.disclaimer}</p>{result.quality_flags.length ? <Items items={result.quality_flags} empty={messages.notScored} /> : null}</div></article>
      <article className="quick-analysis-result-cta panel"><div className="quick-analysis-result-cta-copy"><div className="eyebrow">StageLab</div><h2>{messages.ctaTitle[product]}</h2><p>{messages.ctaBody[product]}</p></div><ProductCtaButtons product="StageLab" context={`${product}_result`} eventName="stage_analysis_stagelab_cta_clicked" eventParams={{ analysis_product: product }} /><TrackedLink className="proof-action" href={localizePathname("/stagelab/", locale)} eventName="stage_analysis_stagelab_cta_clicked" eventParams={{ analysis_product: product, cta_name: messages.learnMore }}>{messages.learnMore}</TrackedLink></article>
    </section>
  );
}
