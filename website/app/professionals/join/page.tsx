import { ProfessionalRecruitmentLanding } from "@/components/marketplace/ProfessionalRecruitmentLanding";
import { buildMetadata } from "@/lib/site";
import { getProfessionalAcquisitionCopy } from "@/lib/professional-acquisition";

const copy = getProfessionalAcquisitionCopy("en");

export const metadata = buildMetadata({
  title: copy.seo.title,
  description: copy.seo.description,
  pathname: "/professionals/join/",
  localizedAlternates: true,
});

export default function ProfessionalRecruitmentPage() {
  return <ProfessionalRecruitmentLanding locale="en" />;
}
