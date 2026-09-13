import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { TrackedLink } from "@/components/TrackedLink";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import type { StageAnalysisMessages } from "@/lib/i18n/stage-analysis-messages";
import { getPosingMessages } from "@/lib/i18n/posing-messages";
import { buildPosingPresentation } from "@/lib/posing-result-presentation";
import type { PaidStageAnalysisProduct, PosingAnalysisResult } from "@/lib/stage-analysis";

function Items({ items }: { items: string[] }) {
  return <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>;
}

export function PosingAnalysisReport({ result, product, locale, messages }: {
  result: PosingAnalysisResult; product: PaidStageAnalysisProduct; locale: Locale; messages: StageAnalysisMessages["result"];
}) {
  const m = getPosingMessages(locale);
  const view = buildPosingPresentation(result, locale);
  const transitionPoses = view.poses.filter((pose) => pose.transition);
  return (
    <section className="quick-analysis-report posing-analysis-report">
      <div className="posing-summary-grid">
        <article className="panel posing-summary">
          <div className="eyebrow">{messages.poweredBy}</div>
          <h1 id="posing-report-heading" tabIndex={-1}>{messages.reportTitle}</h1>
          <div className="posing-overall-score"><span>{messages.score}</span><strong>{result.overall_stage_lab_posing_score == null ? messages.notScored : `${result.overall_stage_lab_posing_score}/100`}</strong></div>
          <p>{view.summary}</p>
          <small className="posing-confidence">{m.confidence[result.analysis_quality]}</small>
        </article>
        {view.opportunity ? <article className="panel posing-opportunity"><h2>{messages.biggestOpportunity}</h2><p>{view.opportunity}</p></article> : null}
      </div>
      {view.priority.length ? <section className="posing-priority" aria-labelledby="posing-corrections-heading">
        <h2 id="posing-corrections-heading">{m.topCorrections}</h2>
        <div className="posing-correction-grid">{view.priority.map((item, index) => <article className="panel" key={index}>
          <h3>{item.title || `${messages.corrections} ${index + 1}`}</h3>
          {item.evidence ? <p>{item.evidence}</p> : null}
          {item.action ? <p><strong>{messages.tryThis}:</strong> {item.action}</p> : null}
          {item.evidenceDetail !== item.evidence || item.actionDetail !== item.action ? <details><summary>{m.moreContext}</summary><p>{item.evidenceDetail}</p><p>{item.actionDetail}</p></details> : null}
        </article>)}</div>
      </section> : null}
      {view.poses.some((pose) => !pose.transition) ? <section className="posing-breakdown">
        <h2>{m.poseBreakdown}</h2>
        <div className="posing-analysis-pose-grid">{view.poses.filter((pose) => !pose.transition).map((pose, index) => <details className="panel posing-analysis-pose" key={index}>
          <summary><span className="posing-analysis-pose-head"><strong>{pose.name}</strong><span aria-label={`${messages.score}: ${pose.score == null ? messages.notScored : `${pose.score}/100`}`}>{pose.score == null ? messages.notScored : `${pose.score}/100`}</span></span><span className="posing-pose-observation">{pose.observation}</span><span className="posing-detail-label">{m.details}</span></summary>
          <div className="posing-expanded">
            <p className="posing-confidence">{pose.confidence}</p>
            {!pose.unknown && pose.strength ? <p><strong>{messages.strongestAspect}:</strong> {pose.strength}</p> : null}
            {!pose.unknown && pose.issue ? <p><strong>{messages.biggestIssue}:</strong> {pose.issue}</p> : null}
            {pose.corrections.length ? <div><strong>{messages.tryThis}</strong><Items items={pose.corrections} /></div> : null}
            {pose.cue ? <p><strong>{messages.coachingCue}:</strong> {pose.cue}</p> : null}
            {pose.components.length ? <details><summary>{m.componentDetails}</summary><ul className="posing-analysis-components">{pose.components.map((component, i) => <li key={i}><span>{component.label}</span><strong aria-label={`${messages.score}: ${component.score == null ? messages.notScored : `${component.score}/100`}`}>{component.score == null ? messages.notScored : `${component.score}/100`}</strong>{component.note ? <small>{component.note}</small> : null}</li>)}</ul></details> : null}
          </div>
        </details>)}</div>
      </section> : null}
      <div className="posing-summary-grid">
        {view.strengths.length ? <article className="panel"><h2>{messages.strengths}</h2><Items items={view.strengths} /></article> : null}
        {view.nextFocus.length ? <article className="panel"><h2>{messages.nextFocus}</h2><Items items={view.nextFocus} /></article> : null}
      </div>
      <div className="posing-secondary">
        {view.consistency.length ? <details className="panel"><summary>{messages.consistency}</summary><Items items={view.consistency} /></details> : null}
        {view.transitions.length || transitionPoses.length ? <details className="panel posing-transitions"><summary>{messages.transitions}<small>{m.frameCoverage}</small></summary><p>{m.sampling}</p><Items items={view.transitions} />{transitionPoses.map((pose, index) => <div key={index}><strong>{m.transition}</strong><p>{pose.observation}</p>{pose.cue ? <p>{pose.cue}</p> : null}</div>)}</details> : null}
        <details className="panel posing-video-quality"><summary>{m.videoQuality}: {m.quality[result.video_usability_status]}<small>{m.qualitySummary}</small></summary><p>{m.sampling}</p><Items items={view.quality} />{view.disclaimer ? <p>{view.disclaimer}</p> : null}</details>
        {view.additionalCorrections.length ? <details className="panel"><summary>{m.moreCorrections}</summary>{view.additionalCorrections.map((item, index) => <div key={index}><h3>{item.title}</h3><p>{item.evidenceDetail}</p><p>{item.actionDetail}</p></div>)}</details> : null}
      </div>
      <article className="quick-analysis-result-cta panel"><div className="quick-analysis-result-cta-copy"><div className="eyebrow">StageLab</div><h2>{messages.ctaTitle[product]}</h2><p>{messages.ctaBody[product]}</p></div><ProductCtaButtons product="StageLab" context={`${product}_result`} eventName="stage_analysis_stagelab_cta_clicked" eventParams={{ analysis_product: product }} displayLabels={{ ios: m.ios, android: m.android, primary: m.openApp }} /><TrackedLink className="proof-action" href={localizePathname("/stagelab/", locale)} eventName="stage_analysis_stagelab_cta_clicked" eventParams={{ analysis_product: product, cta_name: messages.learnMore }}>{messages.learnMore}</TrackedLink></article>
    </section>
  );
}
