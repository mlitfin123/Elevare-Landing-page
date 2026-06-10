import { TrackedLink } from "@/components/TrackedLink";
import { toolMap, type ToolSlug } from "@/lib/tools";

type RelatedToolsProps = {
  currentTool: ToolSlug;
};

export function RelatedTools({ currentTool }: RelatedToolsProps) {
  const tool = toolMap[currentTool];
  const relatedTools = tool.relatedSlugs.map((slug) => toolMap[slug as ToolSlug]).filter(Boolean);

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">Related tools</div>
        <h2 className="section-title">Keep going with the next useful calculator.</h2>
        <p className="section-copy">
          These related tools cover the same planning workflow from calories and macros through prep timing.
        </p>
      </div>

      <div className="tool-related-grid">
        {relatedTools.map((relatedTool) => (
          <article key={relatedTool.slug} className="panel tool-related-card">
            <span className="meta-pill">{relatedTool.title}</span>
            <p>{relatedTool.metaDescription}</p>
            <TrackedLink
              className="blog-link"
              href={`/tools/${relatedTool.slug}`}
              eventName="tool_related_click"
              eventParams={{
                source_tool: currentTool,
                destination_tool: relatedTool.slug,
              }}
            >
              Open tool
            </TrackedLink>
          </article>
        ))}
      </div>
    </section>
  );
}
