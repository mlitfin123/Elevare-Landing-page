import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalizedHomePage } from "@/components/localization/LocalizedHomePage";
import { LocalizedProductPage } from "@/components/localization/LocalizedProductPage";
import { LocalizedQuickAnalysisPage } from "@/components/localization/LocalizedQuickAnalysisPage";
import { QuickAnalysisResultExperience } from "@/components/quick-analysis/QuickAnalysisResultExperience";
import { Suspense } from "react";
import {
  areLocalizedRoutesEnabled,
  getLocalizedRouteParams,
  isLocalizedIndexingEnabled,
  localeFromSegment,
  localizePathname,
} from "@/lib/i18n/config";
import { getMarketingMessages } from "@/lib/i18n/messages";
import { getQuickAnalysisMessages } from "@/lib/i18n/quick-analysis-messages";
import { buildMetadata } from "@/lib/site";

type LocalizedPageParams = {
  locale: string;
  slug?: string[];
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getLocalizedRouteParams();
}

function resolvePage(params: LocalizedPageParams) {
  const locale = localeFromSegment(params.locale);
  const slug = params.slug ?? [];

  if (!locale || locale === "en") return null;
  if (slug.length === 0) return { locale, page: "home" as const, pathname: "/" };
  if (slug.length === 1 && slug[0] === "logbook") return { locale, page: "logbook" as const, pathname: "/logbook/" };
  if (slug.length === 1 && slug[0] === "stagelab") return { locale, page: "stagelab" as const, pathname: "/stagelab/" };
  if (slug.length === 2 && slug[0] === "stagelab" && slug[1] === "quick-analysis") {
    return { locale, page: "quick-analysis" as const, pathname: "/stagelab/quick-analysis/" };
  }
  if (slug.length === 3 && slug[0] === "stagelab" && slug[1] === "quick-analysis" && slug[2] === "result") {
    return { locale, page: "quick-analysis-result" as const, pathname: "/stagelab/quick-analysis/result/" };
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<LocalizedPageParams> }): Promise<Metadata> {
  const resolved = resolvePage(await params);
  if (!resolved || !areLocalizedRoutesEnabled()) return {};

  const quickAnalysisMessages = getQuickAnalysisMessages(resolved.locale);
  const messages = await getMarketingMessages(resolved.locale);
  const seo = resolved.page === "home"
    ? messages.home.seo
    : resolved.page === "logbook" || resolved.page === "stagelab"
      ? messages.products[resolved.page].seo
      : resolved.page === "quick-analysis"
        ? quickAnalysisMessages.seo
        : { title: quickAnalysisMessages.result.seoTitle, description: quickAnalysisMessages.result.seoDescription };
  const pathname = localizePathname(resolved.pathname, resolved.locale);
  const indexingEnabled = isLocalizedIndexingEnabled();

  const metadata = buildMetadata({
    title: seo.title,
    description: seo.description,
    pathname,
    locale: resolved.locale,
    localizedAlternates: true,
    robots: resolved.page === "quick-analysis-result"
      ? { index: false, follow: false, noarchive: true, nosnippet: true }
      : indexingEnabled ? undefined : { index: false, follow: false },
  });

  return resolved.page === "quick-analysis-result"
    ? { ...metadata, referrer: "no-referrer" }
    : metadata;
}

export default async function LocalizedMarketingRoute({ params }: { params: Promise<LocalizedPageParams> }) {
  const resolved = resolvePage(await params);
  if (!resolved || !areLocalizedRoutesEnabled()) notFound();

  const messages = await getMarketingMessages(resolved.locale);
  const quickAnalysisMessages = getQuickAnalysisMessages(resolved.locale);

  if (resolved.page === "home") {
    return <LocalizedHomePage locale={resolved.locale} messages={messages.home} categoryTranslations={messages.marketplaceCategories} />;
  }

  if (resolved.page === "quick-analysis") {
    return <LocalizedQuickAnalysisPage locale={resolved.locale} messages={quickAnalysisMessages} />;
  }

  if (resolved.page === "quick-analysis-result") {
    return (
      <div className="container">
        <Suspense fallback={<section className="quick-analysis-state panel"><h1>{quickAnalysisMessages.result.opening}</h1></section>}>
          <QuickAnalysisResultExperience locale={resolved.locale} messages={quickAnalysisMessages.result} />
        </Suspense>
      </div>
    );
  }

  return <LocalizedProductPage locale={resolved.locale} product={resolved.page} messages={messages.products[resolved.page]} />;
}
