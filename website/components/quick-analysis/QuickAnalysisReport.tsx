import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { TrackedLink } from "@/components/TrackedLink";
import { QuickAnalysisCtaViewTracker } from "@/components/quick-analysis/QuickAnalysisCtaViewTracker";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import type { QuickAnalysisMessages } from "@/lib/i18n/quick-analysis-types";
import type { QuickAnalysisMode, QuickAnalysisResult } from "@/lib/quick-analysis";

type ReportMessages = QuickAnalysisMessages["result"]["report"];

function ResultList({ items, emptyText }: { items: string[]; emptyText: string }) {
  return items.length ? <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p>{emptyText}</p>;
}

function ResultLimitations({ result, mode, messages }: { result: QuickAnalysisResult; mode: QuickAnalysisMode; messages: ReportMessages }) {
  return (
    <section className="quick-analysis-limitations panel">
      <div><span className="stat-label">{messages.analysisContext}</span><h2>{messages.limitationsTitle}</h2><ResultList items={result.limitations} emptyText={messages.noAdditionalItems} /></div>
      {result.caution_flags.length ? <div><span className="stat-label">{messages.cautions}</span><ResultList items={result.caution_flags} emptyText={messages.noAdditionalItems} /></div> : null}
      <p className="fine-print">{mode === "physique_check" ? messages.physiqueDisclaimer : messages.competitionDisclaimer}</p>
      <p className="fine-print">{messages.reportRetention}</p>
    </section>
  );
}

function StageLabResultCta({ mode, locale, messages }: { mode: QuickAnalysisMode; locale: Locale; messages: ReportMessages }) {
  const isPhysiqueCheck = mode === "physique_check";
  return (
    <section className="section final-card panel quick-analysis-result-cta">
      <QuickAnalysisCtaViewTracker mode={mode} />
      <div className="quick-analysis-result-cta-copy">
        <div className="eyebrow">{messages.trackQuestion}</div>
        <h2>{isPhysiqueCheck ? messages.followTitle : messages.continueTitle}</h2>
        <p>{isPhysiqueCheck ? messages.physiqueCtaBody : messages.prepCtaBody}</p>
        <ProductCtaButtons
          product="StageLab"
          context={isPhysiqueCheck ? "quick_analysis_physique_check_result" : "quick_analysis_competition_prep_result"}
          eventName="quick_analysis_stagelab_clicked"
          eventParams={{ analysis_mode: mode }}
          storeEventNames={{
            ios: "quick_analysis_stagelab_ios_clicked",
            android: "quick_analysis_stagelab_android_clicked",
          }}
        />
        <TrackedLink
          className="proof-action"
          href={localizePathname("/stagelab/", locale)}
          eventName="quick_analysis_stagelab_clicked"
          eventParams={{ destination: "stagelab_landing", analysis_mode: mode }}
        >
          {messages.learnMore}
        </TrackedLink>
      </div>
    </section>
  );
}

function CompetitionPrepReport({ result, locale, messages }: { result: QuickAnalysisResult; locale: Locale; messages: ReportMessages }) {
  return (
    <>
      <section className="quick-analysis-report-hero panel">
        <div><div className="eyebrow">{messages.quickAnalysis}</div><h1>{messages.overallRead}</h1><p>{result.summary}</p></div>
        <div className="quick-analysis-condition-score"><span>{messages.bodyFatRange}</span><strong>{result.estimated_body_fat_min}-{result.estimated_body_fat_max}%</strong><small>{messages.confidenceLabels[result.confidence] ?? result.confidence} {messages.confidence}</small></div>
      </section>

      <section className="quick-analysis-report-grid">
        <article className="panel"><span className="stat-label">{messages.conditioning}</span><h2>{messages.visibleConditioning}</h2><p>{result.conditioning_assessment}</p><ResultList items={result.visible_conditioning_markers} emptyText={messages.noAdditionalItems} /></article>
        <article className="panel"><span className="stat-label">{messages.muscularity}</span><h2>{messages.muscularity}</h2><p>{result.muscularity_assessment}</p></article>
        <article className="panel"><span className="stat-label">{messages.structure}</span><h2>{messages.symmetry}</h2><p>{result.symmetry_assessment}</p></article>
        <article className="panel"><span className="stat-label">{messages.presentation}</span><h2>{messages.presentationTitle}</h2><p>{result.presentation_assessment}</p></article>
      </section>

      <section className="quick-analysis-division panel">
        <div><span className="stat-label">{messages.divisionPerspective}</span><h2>{result.prep_status}</h2><p>{result.explanation}</p></div>
        <div className="quick-analysis-alignment"><strong>{result.division_alignment_score}/100</strong><span>{messages.visualAlignmentScore}</span></div>
      </section>

      <section className="quick-analysis-report-grid">
        <article className="panel"><span className="stat-label">{messages.visibleStrengths}</span><h2>{messages.whatStandsOut}</h2><ResultList items={result.visible_strengths} emptyText={messages.noAdditionalItems} /></article>
        <article className="panel"><span className="stat-label">{messages.areasToImprove}</span><h2>{messages.whereToFocus}</h2><ResultList items={result.areas_to_improve} emptyText={messages.noAdditionalItems} /></article>
      </section>

      <section className="panel quick-analysis-judge-panel"><span className="eyebrow">{messages.judgesPerspective}</span><h2>{messages.currentDivisionRead}</h2><p>{result.judges_perspective}</p></section>
      <ResultLimitations result={result} mode="competition_prep" messages={messages} />
      <StageLabResultCta mode="competition_prep" locale={locale} messages={messages} />
    </>
  );
}

function PhysiqueCheckReport({ result, locale, messages }: { result: QuickAnalysisResult; locale: Locale; messages: ReportMessages }) {
  const distance = messages.distanceLabels[result.stage_condition_distance ?? "unavailable"] ?? messages.distanceLabels.unavailable;
  const scoreCards = [
    [messages.conditioning, result.conditioning_score, result.conditioning_assessment],
    [messages.muscularity, result.muscularity_score, result.muscularity_assessment],
    [messages.symmetry, result.symmetry_score, result.symmetry_assessment],
    [messages.presentationTitle, result.presentation_score, result.presentation_assessment],
  ] as const;

  return (
    <>
      <section className="quick-analysis-report-hero quick-analysis-readiness-hero panel">
        <div>
          <div className="eyebrow">{messages.physiqueCheck}</div>
          <h1>{messages.stageReadiness}</h1>
          <p>{result.summary}</p>
          <p className="fine-print">{messages.readinessDefinition}</p>
        </div>
        <div className="quick-analysis-condition-score"><span>{messages.stageReadiness}</span><strong aria-label={messages.scoreOutOf.replace("{score}", String(result.stage_readiness_score))}>{result.stage_readiness_score}/100</strong><small>{messages.readinessLabels[result.stage_readiness_category ?? ""] ?? result.stage_readiness_category}</small></div>
      </section>

      <section className="quick-analysis-snapshot-grid">
        <article className="panel"><span className="stat-label">{messages.visualDistance}</span><strong className="quick-analysis-snapshot-value">{distance}</strong><small>{messages.visualSnapshot}</small></article>
        <article className="panel"><span className="stat-label">{messages.bodyFatRange}</span><strong className="quick-analysis-snapshot-value">{result.estimated_body_fat_min}-{result.estimated_body_fat_max}%</strong><small>{messages.confidenceLabels[result.confidence] ?? result.confidence} {messages.confidence}</small></article>
      </section>

      <section className="quick-analysis-report-grid">
        {scoreCards.map(([label, score, assessment]) => (
          <article className="panel quick-analysis-score-card" key={label}>
            <div><span className="stat-label">{label}</span><strong aria-label={messages.scoreOutOf.replace("{score}", String(score))}>{score}/100</strong></div>
            <p>{assessment}</p>
            {label === messages.conditioning ? <ResultList items={result.visible_conditioning_markers} emptyText={messages.noAdditionalItems} /> : null}
          </article>
        ))}
      </section>
      <p className="quick-analysis-weighting-note fine-print">{messages.weightingNote}</p>

      <section className="quick-analysis-report-grid">
        <article className="panel"><span className="stat-label">{messages.visibleStrengths}</span><h2>{messages.stageOriented}</h2><ResultList items={result.visible_strengths} emptyText={messages.noStrengths} /></article>
        <article className="panel"><span className="stat-label">{messages.visibleDifferences}</span><h2>{messages.separatesFromStage}</h2><ResultList items={result.areas_to_improve} emptyText={messages.noAdditionalItems} /></article>
      </section>

      <section className="quick-analysis-division panel">
        <div><span className="stat-label">{messages.divisionPerspective}</span><h2>{result.prep_status}</h2><p>{result.explanation}</p></div>
        <div className="quick-analysis-alignment"><strong>{result.division_alignment_score}/100</strong><span>{messages.visualDivisionAlignment}</span></div>
      </section>

      <section className="panel quick-analysis-judge-panel"><span className="eyebrow">{messages.judgesPerspective}</span><h2>{messages.currentDivisionRead}</h2><p>{result.judges_perspective}</p></section>
      <ResultLimitations result={result} mode="physique_check" messages={messages} />
      <StageLabResultCta mode="physique_check" locale={locale} messages={messages} />
    </>
  );
}

export function QuickAnalysisReport({ result, locale, messages }: { result: QuickAnalysisResult; locale: Locale; messages: ReportMessages }) {
  const mode = result.analysis_mode ?? "competition_prep";
  return <div className="quick-analysis-report">{mode === "physique_check" ? <PhysiqueCheckReport result={result} locale={locale} messages={messages} /> : <CompetitionPrepReport result={result} locale={locale} messages={messages} />}</div>;
}
