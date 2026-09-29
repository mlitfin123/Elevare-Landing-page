import type { Metadata } from "next";
import { StageLabCoachStartPage } from "@/components/stagelab/StageLabCoachStartPage";
import { buildMetadata } from "@/lib/site";
import { stageLabCoachStartMessages } from "@/lib/stagelab-coach-start";

export function generateMetadata(): Metadata {
  const copy = stageLabCoachStartMessages.en;
  return buildMetadata({
    title: copy.seoTitle,
    description: copy.seoDescription,
    pathname: "/stagelab/coaches/start/",
    localizedAlternates: true,
    robots: { index: true, follow: true },
  });
}

export default function StageLabCoachStartRoute() {
  return <StageLabCoachStartPage locale="en" />;
}
