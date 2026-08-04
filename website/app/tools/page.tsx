import { StructuredData } from "@/components/StructuredData";
import { CalculatorDirectory } from "@/components/tools/CalculatorDirectory";
import { WorkoutGeneratorFeature } from "@/components/tools/WorkoutGeneratorFeature";
import { buildMetadata, absoluteUrl } from "@/lib/site";
import { getCalculatorPath, tools } from "@/lib/tools";

export const metadata = buildMetadata({
  title: "Fitness Calculators",
  description:
    "Explore free calorie, macro, body fat, strength, and contest prep calculators from Elevare.",
  pathname: "/tools",
  canonicalPath: "/calculators",
  robots: {
    index: false,
    follow: true,
  },
});

export default function ToolsIndexPage() {
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

      <WorkoutGeneratorFeature sourcePage="tools_index" />
      <CalculatorDirectory sourcePage="tools_index" />
    </div>
  );
}
