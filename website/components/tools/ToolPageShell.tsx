import { RelatedTools } from "@/components/tools/RelatedTools";
import { StructuredData } from "@/components/StructuredData";
import { ToolLogbookCta } from "@/components/tools/ToolLogbookCta";
import { absoluteUrl } from "@/lib/site";
import { toolMap, TOOL_GROUPS, type ToolSlug } from "@/lib/tools";

type ToolPageShellProps = {
  toolSlug: ToolSlug;
  children: React.ReactNode;
};

export function ToolPageShell({ toolSlug, children }: ToolPageShellProps) {
  const tool = toolMap[toolSlug];
  const group = TOOL_GROUPS[tool.group];
  const url = absoluteUrl(`/tools/${tool.slug}`);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Tools",
          item: absoluteUrl("/tools"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: tool.title,
          item: url,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: tool.title,
      description: tool.metaDescription,
      url,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      publisher: {
        "@type": "Organization",
        name: "Elevare Fit LLC",
        url: absoluteUrl("/"),
      },
    },
  ];

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <section className="hero tool-hero">
        <div className="eyebrow">{group.title}</div>
        <h1>{tool.title}</h1>
        <p>{tool.intro}</p>
      </section>

      {children}

      <section className="section">
        <article className="callout tool-disclaimer-card">
          <span className="meta-pill">Disclaimer</span>
          <p>These estimates are for educational purposes only and are not medical advice.</p>
        </article>
      </section>

      <RelatedTools currentTool={toolSlug} />
      <ToolLogbookCta toolSlug={toolSlug} />
    </div>
  );
}
