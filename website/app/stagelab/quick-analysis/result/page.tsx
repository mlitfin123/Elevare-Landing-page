import type { Metadata } from "next";
import { Suspense } from "react";
import { QuickAnalysisResultExperience } from "@/components/quick-analysis/QuickAnalysisResultExperience";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Your StageLab Quick Analysis",
    description: "Securely upload current physique photos and view your one-time StageLab Quick Analysis result.",
    pathname: "/stagelab/quick-analysis/result/",
    robots: { index: false, follow: false, noarchive: true, nosnippet: true },
  }),
  referrer: "no-referrer",
};

export default function QuickAnalysisResultPage() {
  return <div className="container"><Suspense fallback={<section className="quick-analysis-state panel"><h1>Opening your analysis...</h1></section>}><QuickAnalysisResultExperience /></Suspense></div>;
}
