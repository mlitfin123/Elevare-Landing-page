import { LocalizedQuickAnalysisPage } from "@/components/localization/LocalizedQuickAnalysisPage";
import { getQuickAnalysisMessages } from "@/lib/i18n/quick-analysis-messages";
import { buildMetadata } from "@/lib/site";

const messages = getQuickAnalysisMessages("en");

export const metadata = buildMetadata({
  title: messages.seo.title,
  description: messages.seo.description,
  pathname: "/stagelab/quick-analysis/",
});

export default function QuickAnalysisPage() {
  return <LocalizedQuickAnalysisPage locale="en" messages={messages} />;
}
