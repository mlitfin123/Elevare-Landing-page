import { LocalizedHomePage } from "@/components/localization/LocalizedHomePage";
import { getMarketingMessages } from "@/lib/i18n/messages";
import { buildMetadata } from "@/lib/site";

export async function generateMetadata() {
  const { home } = await getMarketingMessages("en");
  return buildMetadata({ ...home.seo, pathname: "/", localizedAlternates: true });
}
export default async function HomePage() {
  const { home } = await getMarketingMessages("en");
  return <LocalizedHomePage locale="en" messages={home} />;
}
