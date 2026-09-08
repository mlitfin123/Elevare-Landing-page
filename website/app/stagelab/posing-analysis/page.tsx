import { LocalizedStageAnalysisPage } from "@/components/localization/LocalizedStageAnalysisPage";
import { getStageAnalysisMessages } from "@/lib/i18n/stage-analysis-messages";
import { buildMetadata } from "@/lib/site";

const messages = getStageAnalysisMessages("en");

export const metadata = buildMetadata({
  title: messages.seo.posing_analysis.title,
  description: messages.seo.posing_analysis.description,
  pathname: "/stagelab/posing-analysis/",
  localizedAlternates: true,
});

export default function PosingAnalysisPage() {
  return <LocalizedStageAnalysisPage product="posing_analysis" locale="en" messages={messages} />;
}
