import { TrackedLink } from "@/components/TrackedLink";
import { getCalculatorPath, toolMap, type ToolSlug } from "@/lib/tools";

type RelatedTrainingToolsProps = {
  title: string;
  description: string;
  toolSlugs: ToolSlug[];
  sourcePage: string;
};

export function RelatedTrainingTools({
  title,
  description,
  toolSlugs,
  sourcePage,
}: RelatedTrainingToolsProps) {
  const tools = toolSlugs
    .map((slug) => toolMap[slug])
    .filter((tool): tool is (typeof toolMap)[ToolSlug] => tool != null);

  if (tools.length === 0) {
    return null;
  }

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">Related tools</div>
        <h2 className="section-title">{title}</h2>
        <p className="section-copy">{description}</p>
      </div>

      <div className="nutrition-link-cloud">
        {tools.map((tool) => (
          <TrackedLink
            key={tool.slug}
            className="nutrition-link-pill"
            href={getCalculatorPath(tool.slug)}
            eventName="tool_open"
            eventParams={{
              tool_slug: tool.slug,
              source_page: sourcePage,
            }}
          >
            {tool.title}
          </TrackedLink>
        ))}
      </div>
    </section>
  );
}
