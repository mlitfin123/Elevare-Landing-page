import type { Metadata } from "next";
import { Suspense } from "react";
import { QuickAnalysisResultExperience } from "@/components/quick-analysis/QuickAnalysisResultExperience";
import { getQuickAnalysisMessages } from "@/lib/i18n/quick-analysis-messages";
import { buildMetadata } from "@/lib/site";

const messages = getQuickAnalysisMessages("en");

export const metadata: Metadata = {
  ...buildMetadata({
    title: messages.result.seoTitle,
    description: messages.result.seoDescription,
    pathname: "/stagelab/quick-analysis/result/",
    robots: { index: false, follow: false, noarchive: true, nosnippet: true },
  }),
  referrer: "no-referrer",
};

export default function QuickAnalysisResultPage() {
  return <div className="container"><Suspense fallback={<section className="quick-analysis-state panel"><h1>{messages.result.opening}</h1></section>}><QuickAnalysisResultExperience locale="en" messages={messages.result} /></Suspense></div>;
}
