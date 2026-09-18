import type { Metadata } from "next";
import { StageLabStartPage } from "@/components/stagelab/StageLabStartPage";
import { buildMetadata } from "@/lib/site";
import { stageLabStartMessages } from "@/lib/stagelab-start";

export function generateMetadata(): Metadata {
  const copy = stageLabStartMessages.en;
  return buildMetadata({
    title: copy.title,
    description: copy.description,
    pathname: "/stagelab/start/",
    robots: { index: false, follow: true },
  });
}

export default function StageLabStartRoute() {
  return <StageLabStartPage locale="en" />;
}
