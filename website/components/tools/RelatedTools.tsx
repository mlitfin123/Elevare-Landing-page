import { TrackedLink } from "@/components/TrackedLink";
import { getCalculatorPath, toolMap, type ToolSlug } from "@/lib/tools";
import { getCalculatorMessages } from "@/lib/i18n/calculator-messages";
import { getLocalizedTool } from "@/lib/i18n/calculator-content";
import { localizePathname, type Locale } from "@/lib/i18n/config";

type RelatedToolsProps = {
  currentTool: ToolSlug;
  locale?: Locale;
};

export function RelatedTools({ currentTool, locale = "en" }: RelatedToolsProps) {
  const tool = toolMap[currentTool];
  const messages = getCalculatorMessages(locale).shell;
  const relatedTools = tool.relatedSlugs
    .map((slug) => toolMap[slug as ToolSlug])
    .filter(Boolean)
    .map((relatedTool) => getLocalizedTool(relatedTool.slug, locale));

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">{messages.relatedEyebrow}</div>
        <h2 className="section-title">{messages.relatedTitle}</h2>
        <p className="section-copy">{messages.relatedCopy}</p>
      </div>

      <div className="tool-related-grid">
        {relatedTools.map((relatedTool) => (
          <article key={relatedTool.slug} className="panel tool-related-card">
            <span className="meta-pill">{relatedTool.title}</span>
            <p>{relatedTool.metaDescription}</p>
            <TrackedLink
              className="blog-link"
              href={localizePathname(getCalculatorPath(relatedTool.slug), locale)}
              eventName="tool_related_click"
              eventParams={{
                source_tool: currentTool,
                destination_tool: relatedTool.slug,
              }}
            >
              {messages.openTool}
            </TrackedLink>
          </article>
        ))}
      </div>
    </section>
  );
}
