import type { Metadata } from "next";
import { Suspense } from "react";
import { CompleteStageAnalysisResultExperience } from "@/components/stage-analysis/CompleteStageAnalysisResultExperience";
import { getQuickAnalysisMessages } from "@/lib/i18n/quick-analysis-messages";
import { getStageAnalysisMessages } from "@/lib/i18n/stage-analysis-messages";
import { buildMetadata } from "@/lib/site";

const quickMessages = getQuickAnalysisMessages("en");
const stageMessages = getStageAnalysisMessages("en");

export const metadata: Metadata = {
  ...buildMetadata({
    title: stageMessages.result.completeTitle,
    description: stageMessages.seo.complete_stage_analysis.description,
    pathname: "/stagelab/complete-stage-analysis/result/",
    robots: { index: false, follow: false, noarchive: true, nosnippet: true },
  }),
  referrer: "no-referrer",
};

export default function CompleteStageAnalysisResultPage() {
  return <div className="container"><Suspense fallback={<section className="quick-analysis-state panel"><h1>{stageMessages.result.opening}</h1></section>}><CompleteStageAnalysisResultExperience locale="en" quickMessages={quickMessages.result} stageMessages={stageMessages.result} /></Suspense></div>;
}
