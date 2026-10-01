import { StageLabLandingPage } from "@/components/stagelab/StageLabLandingPage";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "StageLab: Competition Prep, Physique Progress & Posing",
  description:
    "Track competition prep, compare physique progress, review posing feedback, and keep nutrition, cardio, recovery, and check-ins together in StageLab.",
  pathname: "/stagelab",
  localizedAlternates: true,
});

export default function StageLabPage() {
  return <StageLabLandingPage locale="en" />;
}
