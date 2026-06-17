import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import { WorkoutGeneratorFeature } from "@/components/tools/WorkoutGeneratorFeature";
import { absoluteUrl, buildMetadata } from "@/lib/site";
import { getCalculatorPath, getToolsByGroup, TOOL_GROUPS, tools } from "@/lib/tools";

export const metadata = buildMetadata({
  title: "Fitness Calculators",
  description:
    "Explore free calorie, macro, body fat, strength, and contest prep calculators from Elevare.",
  pathname: "/calculators",
});

const orderedGroups = ["nutrition", "strength", "prep"] as const;

export default function CalculatorsIndexPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Elevare Fitness Calculators",
    url: absoluteUrl("/calculators"),
    description: "A collection of free training, nutrition, and contest prep calculators and planning tools.",
    hasPart: [
      ...tools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.title,
        url: absoluteUrl(getCalculatorPath(tool.slug)),
      })),
      {
        "@type": "ListItem",
        position: tools.length + 1,
        name: "Workout Generator",
        url: absoluteUrl("/tools/workout-generator"),
      },
    ],
  };

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <section className="hero">
        <div className="eyebrow">Calculators</div>
        <h1>Free fitness calculators for calories, strength, and prep.</h1>
        <p>
          Explore practical calculators and planning tools across nutrition, training, and bodybuilding prep.
        </p>
      </section>

      <WorkoutGeneratorFeature sourcePage="calculators_index" />

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
                    href={getCalculatorPath(tool.slug)}
                    eventName="tool_open"
                    eventParams={{
                      tool_slug: tool.slug,
                      source_page: "calculators_index",
                    }}
                  >
                    Open calculator
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
