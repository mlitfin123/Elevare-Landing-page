import { LocalizedStageAnalysisPage } from "@/components/localization/LocalizedStageAnalysisPage";
import { getStageAnalysisMessages } from "@/lib/i18n/stage-analysis-messages";
import { buildMetadata } from "@/lib/site";

const messages = getStageAnalysisMessages("en");

export const metadata = buildMetadata({
  title: messages.seo.complete_stage_analysis.title,
  description: messages.seo.complete_stage_analysis.description,
  pathname: "/stagelab/complete-stage-analysis/",
  localizedAlternates: true,
});

export default function CompleteStageAnalysisPage() {
  return <LocalizedStageAnalysisPage product="complete_stage_analysis" locale="en" messages={messages} />;
}
