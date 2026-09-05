import { RelatedTools } from "@/components/tools/RelatedTools";
import { StructuredData } from "@/components/StructuredData";
import { ToolLogbookCta } from "@/components/tools/ToolLogbookCta";
import { EstimateDisclaimer } from "@/components/ContentDisclaimer";
import { absoluteUrl } from "@/lib/site";
import { getCalculatorPath, TOOL_GROUPS, type ToolSlug } from "@/lib/tools";
import { getCalculatorMessages } from "@/lib/i18n/calculator-messages";
import { getLocalizedTool } from "@/lib/i18n/calculator-content";
import { localizePathname, type Locale } from "@/lib/i18n/config";

type ToolPageShellProps = {
  toolSlug: ToolSlug;
  children: React.ReactNode;
  locale?: Locale;
};

export function ToolPageShell({ toolSlug, children, locale = "en" }: ToolPageShellProps) {
  const tool = getLocalizedTool(toolSlug, locale);
  const messages = getCalculatorMessages(locale);
  const group = locale === "en" ? TOOL_GROUPS[tool.group] : messages.groups[tool.group];
  const url = absoluteUrl(localizePathname(getCalculatorPath(tool.slug), locale));

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: messages.shell.calculators,
          item: absoluteUrl(localizePathname("/calculators", locale)),
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
            <div className="eyebrow">{messages.shell.howItWorks}</div>
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
          <div className="eyebrow">{messages.shell.faq}</div>
          <h2 className="section-title">{messages.shell.faqTitle.replace("{title}", tool.title)}</h2>
          <p className="section-copy">{messages.shell.faqIntro}</p>
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
        <EstimateDisclaimer locale={locale} />
      </section>

      <RelatedTools currentTool={toolSlug} locale={locale} />
      <ToolLogbookCta toolSlug={toolSlug} locale={locale} />
    </div>
  );
}
