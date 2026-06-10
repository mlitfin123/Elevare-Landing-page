import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import { buildMetadata, absoluteUrl } from "@/lib/site";
import { getToolsByGroup, TOOL_GROUPS, tools } from "@/lib/tools";

export const metadata = buildMetadata({
  title: "Fitness Tools",
  description:
    "Explore free calorie, macro, body fat, strength, and contest prep tools from Elevare.",
  pathname: "/tools",
});

const orderedGroups = ["nutrition", "strength", "prep"] as const;

export default function ToolsIndexPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Elevare Fitness Tools",
    url: absoluteUrl("/tools"),
    description: "A collection of free training, nutrition, and contest prep calculators and planning tools.",
    hasPart: tools.map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tool.title,
      url: absoluteUrl(`/tools/${tool.slug}`),
    })),
  };

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <section className="hero">
        <div className="eyebrow">Tools</div>
        <h1>Free fitness tools for calories, strength, and prep.</h1>
        <p>
          Explore practical calculators and planning tools across nutrition, training, and bodybuilding prep
          without needing an account.
        </p>
      </section>

      {orderedGroups.map((groupKey) => {
        const group = TOOL_GROUPS[groupKey];
        const groupTools = getToolsByGroup(groupKey);

        return (
          <section key={group.slug} className="section">
            <div className="section-head">
              <div className="eyebrow">{group.title}</div>
              <h2 className="section-title">{group.title}</h2>
              <p className="section-copy">{group.description}</p>
            </div>

            <div className="tool-index-grid">
              {groupTools.map((tool) => (
                <article key={tool.slug} className="panel tool-index-card">
                  <span className="meta-pill">{group.title}</span>
                  <h3>{tool.title}</h3>
                  <p>{tool.metaDescription}</p>
                  <TrackedLink
                    className="button button-secondary"
                    href={`/tools/${tool.slug}`}
                    eventName="tool_open"
                    eventParams={{
                      tool_slug: tool.slug,
                      source_page: "tools_index",
                    }}
                  >
                    Open tool
                  </TrackedLink>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
