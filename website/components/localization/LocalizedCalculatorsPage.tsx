import { notFound } from "next/navigation";
import { CalculatorDirectory } from "@/components/tools/CalculatorDirectory";
import { StructuredData } from "@/components/StructuredData";
import { ToolCalculatorRenderer } from "@/components/tools/ToolCalculatorRenderer";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { TrackedLink } from "@/components/TrackedLink";
import { getCalculatorMessages } from "@/lib/i18n/calculator-messages";
import { getLocalizedTool } from "@/lib/i18n/calculator-content";
import { localizePathname, type Locale } from "@/lib/i18n/config";
import { absoluteUrl } from "@/lib/site";
import { getCalculatorPath, getTool, tools } from "@/lib/tools";

type Props = {
  locale: Locale;
  slug?: string;
};

function LocalizedWorkoutFeature({ locale }: { locale: Locale }) {
  const messages = getCalculatorMessages(locale).index;

  return (
    <section className="section">
      <article className="panel tool-feature-card">
        <div className="section-head">
          <div className="eyebrow">{messages.featuredTool}</div>
          <h2 className="section-title">{messages.workoutFeatureTitle}</h2>
          <p className="section-copy">{messages.workoutFeatureCopy}</p>
        </div>
        <div className="hero-actions">
          <TrackedLink
            className="button button-primary"
            href="/tools/workout-generator/"
            hrefLang="en"
            eventName="tool_open"
            eventParams={{ tool_slug: "workout-generator", source_page: "localized_calculators_index" }}
          >
            {messages.openWorkoutGenerator}
          </TrackedLink>
          <TrackedLink
            className="button button-secondary"
            href={localizePathname("/workouts/", locale)}
            eventName="cta_click"
            eventParams={{ cta_name: "Browse workout templates", cta_context: "localized_calculators_index" }}
          >
            {messages.browseWorkoutTemplates}
          </TrackedLink>
        </div>
      </article>
    </section>
  );
}

function CalculatorsIndex({ locale }: { locale: Locale }) {
  const messages = getCalculatorMessages(locale);
  const pathname = localizePathname("/calculators/", locale);

  return (
    <div className="container">
      <StructuredData data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: messages.seo.indexTitle,
        url: absoluteUrl(pathname),
        description: messages.seo.indexDescription,
        hasPart: tools.map((tool, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: getLocalizedTool(tool.slug, locale).title,
          url: absoluteUrl(localizePathname(getCalculatorPath(tool.slug), locale)),
        })),
      }} />

      <section className="hero">
        <div className="eyebrow">{messages.index.eyebrow}</div>
        <h1>{messages.index.title}</h1>
        <p>{messages.index.intro}</p>
      </section>

      <LocalizedWorkoutFeature locale={locale} />
      <CalculatorDirectory sourcePage="calculators_index" locale={locale} />
    </div>
  );
}

export function LocalizedCalculatorsPage({ locale, slug }: Props) {
  if (!slug) return <CalculatorsIndex locale={locale} />;

  const tool = getTool(slug);
  if (!tool) notFound();

  return (
    <ToolPageShell toolSlug={tool.slug} locale={locale}>
      <ToolCalculatorRenderer toolSlug={tool.slug} locale={locale} />
    </ToolPageShell>
  );
}
