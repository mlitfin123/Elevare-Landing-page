import { TrustSafetyPageContent } from "@/components/marketplace/TrustSafetyPageContent";
import { buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Trust and Safety | Elevare Professional Marketplace",
  description: "Learn what Elevare reviews, what marketplace trust statuses mean, and how to evaluate and report concerns about independent professionals.",
  pathname: "/trust-safety/",
  localizedAlternates: true,
});

export default function TrustSafetyPage() {
  return <TrustSafetyPageContent />;
}
