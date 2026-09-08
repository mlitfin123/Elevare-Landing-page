import type { Metadata } from "next";
import { Suspense } from "react";
import { PosingAnalysisResultExperience } from "@/components/stage-analysis/PosingAnalysisResultExperience";
import { getStageAnalysisMessages } from "@/lib/i18n/stage-analysis-messages";
import { buildMetadata } from "@/lib/site";

const messages = getStageAnalysisMessages("en");

export const metadata: Metadata = {
  ...buildMetadata({
    title: messages.result.reportTitle,
    description: messages.seo.posing_analysis.description,
    pathname: "/stagelab/posing-analysis/result/",
    robots: { index: false, follow: false, noarchive: true, nosnippet: true },
  }),
  referrer: "no-referrer",
};

export default function PosingAnalysisResultPage() {
  return <div className="container"><Suspense fallback={<section className="quick-analysis-state panel"><h1>{messages.result.opening}</h1></section>}><PosingAnalysisResultExperience product="posing_analysis" locale="en" messages={messages.result} /></Suspense></div>;
}
