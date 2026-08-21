import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { TrackedLink } from "@/components/TrackedLink";
import { QuickAnalysisCtaViewTracker } from "@/components/quick-analysis/QuickAnalysisCtaViewTracker";
import type { QuickAnalysisMode, QuickAnalysisResult } from "@/lib/quick-analysis";

function ResultList({ items, emptyText = "No additional items were identified." }: { items: string[]; emptyText?: string }) {
  return items.length ? <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p>{emptyText}</p>;
}

function ResultLimitations({ result, mode }: { result: QuickAnalysisResult; mode: QuickAnalysisMode }) {
  return (
    <section className="quick-analysis-limitations panel">
      <div><span className="stat-label">Analysis context</span><h2>What can affect this read</h2><ResultList items={result.limitations} /></div>
      {result.caution_flags.length ? <div><span className="stat-label">Cautions</span><ResultList items={result.caution_flags} /></div> : null}
      <p className="fine-print">
        StageLab Quick Analysis provides visual fitness and physique information only. Body-fat ranges are estimates, not medical measurements. {mode === "physique_check" ? "Stage Readiness is not an official judging score and does not predict contest placement or outcomes." : "This report is not official judging and does not guarantee stage readiness, placement, or competition outcomes."} It is not medical advice or a diagnosis.
      </p>
      <p className="fine-print">Your submitted photos were used only to generate this analysis and were not stored by ElevareFit. This structured report remains available for up to 72 hours.</p>
    </section>
  );
}

function StageLabResultCta({ mode }: { mode: QuickAnalysisMode }) {
  const isPhysiqueCheck = mode === "physique_check";
  return (
    <section className="section final-card panel quick-analysis-result-cta">
      <QuickAnalysisCtaViewTracker mode={mode} />
      <div className="quick-analysis-result-cta-copy">
        <div className="eyebrow">{isPhysiqueCheck ? "Curious what happens if you track it over time?" : "Want to track this week to week?"}</div>
        <h2>{isPhysiqueCheck ? "Follow your physique in StageLab." : "Continue the process in StageLab."}</h2>
        <p>{isPhysiqueCheck ? "StageLab lets physique athletes and competitors track check-ins, conditioning, and prep trends week to week." : "StageLab adds ongoing check-ins, saved history, trends, and structured prep tracking for athletes and coaches."}</p>
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
          href="/stagelab/"
          eventName="quick_analysis_stagelab_clicked"
          eventParams={{ destination: "stagelab_landing", analysis_mode: mode }}
        >
          Learn more about StageLab
        </TrackedLink>
      </div>
    </section>
  );
}

function CompetitionPrepReport({ result }: { result: QuickAnalysisResult }) {
  return (
    <>
      <section className="quick-analysis-report-hero panel">
        <div><div className="eyebrow">StageLab Quick Analysis</div><h1>Overall read</h1><p>{result.summary}</p></div>
        <div className="quick-analysis-condition-score"><span>Estimated visual body-fat range</span><strong>{result.estimated_body_fat_min}-{result.estimated_body_fat_max}%</strong><small>{result.confidence} confidence</small></div>
      </section>

      <section className="quick-analysis-report-grid">
        <article className="panel"><span className="stat-label">Conditioning</span><h2>Visible conditioning</h2><p>{result.conditioning_assessment}</p><ResultList items={result.visible_conditioning_markers} /></article>
        <article className="panel"><span className="stat-label">Muscularity</span><h2>Muscularity</h2><p>{result.muscularity_assessment}</p></article>
        <article className="panel"><span className="stat-label">Structure</span><h2>Symmetry &amp; proportions</h2><p>{result.symmetry_assessment}</p></article>
        <article className="panel"><span className="stat-label">Presentation</span><h2>Presentation in submitted photos</h2><p>{result.presentation_assessment}</p></article>
      </section>

      <section className="quick-analysis-division panel">
        <div><span className="stat-label">Division perspective</span><h2>{result.prep_status}</h2><p>{result.explanation}</p></div>
        <div className="quick-analysis-alignment"><strong>{result.division_alignment_score}/100</strong><span>visual alignment score</span></div>
      </section>

      <section className="quick-analysis-report-grid">
        <article className="panel"><span className="stat-label">Visible strengths</span><h2>What stands out</h2><ResultList items={result.visible_strengths} /></article>
        <article className="panel"><span className="stat-label">Areas to improve</span><h2>Where to focus</h2><ResultList items={result.areas_to_improve} /></article>
      </section>

      <section className="panel quick-analysis-judge-panel"><span className="eyebrow">Judge&apos;s Perspective</span><h2>Current division read</h2><p>{result.judges_perspective}</p></section>
      <ResultLimitations result={result} mode="competition_prep" />
      <StageLabResultCta mode="competition_prep" />
    </>
  );
}

function PhysiqueCheckReport({ result }: { result: QuickAnalysisResult }) {
  const distance = result.stage_condition_distance?.replace("_", " ") ?? "Not available";
  const scoreCards = [
    ["Conditioning", result.conditioning_score, result.conditioning_assessment],
    ["Muscularity", result.muscularity_score, result.muscularity_assessment],
    ["Symmetry & proportions", result.symmetry_score, result.symmetry_assessment],
    ["Presentation in submitted photos", result.presentation_score, result.presentation_assessment],
  ] as const;

  return (
    <>
      <section className="quick-analysis-report-hero quick-analysis-readiness-hero panel">
        <div>
          <div className="eyebrow">StageLab Physique Check</div>
          <h1>Stage Readiness</h1>
          <p>{result.summary}</p>
          <p className="fine-print">Stage Readiness is a composite visual profile based on conditioning, muscularity, symmetry and proportions, and presentation in the submitted photos. Conditioning also limits the highest possible readiness band when visible stage conditioning is not yet present. It is not a timeline, official judging score, or placement prediction.</p>
        </div>
        <div className="quick-analysis-condition-score"><span>Stage Readiness</span><strong aria-label={`${result.stage_readiness_score} out of 100`}>{result.stage_readiness_score}/100</strong><small>{result.stage_readiness_category}</small></div>
      </section>

      <section className="quick-analysis-snapshot-grid">
        <article className="panel"><span className="stat-label">Visual distance from stage condition</span><strong className="quick-analysis-snapshot-value">{distance}</strong><small>A visual snapshot, not a weeks-out estimate.</small></article>
        <article className="panel"><span className="stat-label">Estimated visual body-fat range</span><strong className="quick-analysis-snapshot-value">{result.estimated_body_fat_min}-{result.estimated_body_fat_max}%</strong><small>{result.confidence} confidence</small></article>
      </section>

      <section className="quick-analysis-report-grid">
        {scoreCards.map(([label, score, assessment]) => (
          <article className="panel quick-analysis-score-card" key={label}>
            <div><span className="stat-label">{label}</span><strong aria-label={`${score} out of 100`}>{score}/100</strong></div>
            <p>{assessment}</p>
            {label === "Conditioning" ? <ResultList items={result.visible_conditioning_markers} /> : null}
          </article>
        ))}
      </section>
      <p className="quick-analysis-weighting-note fine-print">Stage Readiness weighting: conditioning 40%, muscularity 25%, symmetry and proportions 20%, presentation in submitted photos 15%. A conditioning safeguard prevents the final readiness band from overstating visual proximity to stage condition.</p>

      <section className="quick-analysis-report-grid">
        <article className="panel"><span className="stat-label">Visible strengths</span><h2>What already looks stage-oriented</h2><ResultList items={result.visible_strengths} emptyText="No additional strengths could be assessed confidently from the submitted photos." /></article>
        <article className="panel"><span className="stat-label">Visible differences</span><h2>What still separates you from stage condition</h2><ResultList items={result.areas_to_improve} /></article>
      </section>

      <section className="quick-analysis-division panel">
        <div><span className="stat-label">Division perspective</span><h2>{result.prep_status}</h2><p>{result.explanation}</p></div>
        <div className="quick-analysis-alignment"><strong>{result.division_alignment_score}/100</strong><span>visual division alignment</span></div>
      </section>

      <section className="panel quick-analysis-judge-panel"><span className="eyebrow">Judge&apos;s Perspective</span><h2>Current division read</h2><p>{result.judges_perspective}</p></section>
      <ResultLimitations result={result} mode="physique_check" />
      <StageLabResultCta mode="physique_check" />
    </>
  );
}

export function QuickAnalysisReport({ result }: { result: QuickAnalysisResult }) {
  const mode = result.analysis_mode ?? "competition_prep";
  return <div className="quick-analysis-report">{mode === "physique_check" ? <PhysiqueCheckReport result={result} /> : <CompetitionPrepReport result={result} />}</div>;
}
