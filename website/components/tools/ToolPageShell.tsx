import { RelatedTools } from "@/components/tools/RelatedTools";
import { StructuredData } from "@/components/StructuredData";
import { ToolLogbookCta } from "@/components/tools/ToolLogbookCta";
import { absoluteUrl } from "@/lib/site";
import { getCalculatorPath, toolMap, TOOL_GROUPS, type ToolSlug } from "@/lib/tools";

type ToolPageShellProps = {
  toolSlug: ToolSlug;
  children: React.ReactNode;
};

export function ToolPageShell({ toolSlug, children }: ToolPageShellProps) {
  const tool = toolMap[toolSlug];
  const group = TOOL_GROUPS[tool.group];
  const url = absoluteUrl(getCalculatorPath(tool.slug));

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Calculators",
          item: absoluteUrl("/calculators"),
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
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: tool.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
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
        <article className="panel tool-copy-card">
          <div className="section-head">
            <div className="eyebrow">How it works</div>
            <h2 className="section-title">{tool.explanationHeading}</h2>
          </div>
          <div className="tool-copy-stack">
            {tool.explanation.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </article>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">FAQ</div>
          <h2 className="section-title">Common questions about this calculator.</h2>
          <p className="section-copy">
            Use these quick answers as a starting point, then compare the result to your real-world progress.
          </p>
        </div>

        <div className="tool-faq-grid">
          {tool.faqs.map((faq) => (
            <article key={faq.question} className="panel tool-faq-card">
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

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
