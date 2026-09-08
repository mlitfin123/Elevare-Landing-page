"use client";

import { QuickAnalysisResultExperience } from "@/components/quick-analysis/QuickAnalysisResultExperience";
import { PosingAnalysisResultExperience } from "@/components/stage-analysis/PosingAnalysisResultExperience";
import { CompleteStagePriorities } from "@/components/stage-analysis/CompleteStagePriorities";
import type { Locale } from "@/lib/i18n/config";
import type { QuickAnalysisMessages } from "@/lib/i18n/quick-analysis-types";
import type { StageAnalysisMessages } from "@/lib/i18n/stage-analysis-messages";

export function CompleteStageAnalysisResultExperience({
  locale,
  quickMessages,
  stageMessages,
}: {
  locale: Locale;
  quickMessages: QuickAnalysisMessages["result"];
  stageMessages: StageAnalysisMessages["result"];
}) {
  return (
    <div className="complete-stage-result">
      <section className="quick-analysis-report-hero panel complete-stage-result-heading">
        <div>
          <div className="eyebrow">StageLab</div>
          <h1>{stageMessages.completeTitle}</h1>
          <p>{stageMessages.componentPending}</p>
        </div>
      </section>
      <section className="complete-stage-component" aria-labelledby="complete-stage-physique-heading">
        <div className="section-heading"><div><div className="eyebrow">01</div><h2 id="complete-stage-physique-heading">{stageMessages.physiqueComponent}</h2></div></div>
        <QuickAnalysisResultExperience
          locale={locale}
          messages={quickMessages}
          resultPath="/stagelab/complete-stage-analysis/result/"
          trackPurchase={false}
          showReportCta={false}
        />
      </section>
      <section className="complete-stage-component" aria-labelledby="complete-stage-posing-heading">
        <div className="section-heading"><div><div className="eyebrow">02</div><h2 id="complete-stage-posing-heading">{stageMessages.posingComponent}</h2></div></div>
        <PosingAnalysisResultExperience
          product="complete_stage_analysis"
          locale={locale}
          messages={stageMessages}
          showCompleteHeading
        />
      </section>
      <CompleteStagePriorities messages={stageMessages} />
    </div>
  );
}
