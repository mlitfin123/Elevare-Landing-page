import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import { TrainingDisclaimer } from "@/components/ContentDisclaimer";
import { WorkoutRecommendationTool } from "@/components/tools/WorkoutRecommendationTool";
import { TrainingLogbookCta } from "@/components/training/TrainingLogbookCta";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import { getWorkoutGeneratorMessages } from "@/lib/i18n/workout-generator-content";
import { absoluteUrl } from "@/lib/site";
import { getAllExercises, getAllWorkoutTemplateExercises, getAllWorkoutTemplates } from "@/lib/training";

export async function LocalizedWorkoutGeneratorPage({ locale }: { locale: Locale }) {
  const messages = getWorkoutGeneratorMessages(locale);
  const pathname = localizePathname("/tools/workout-generator/", locale);
  const toolsLabel = locale === "es-419" ? "Herramientas" : locale === "pt-BR" ? "Ferramentas" : "Tools";
  const [exercises, workoutTemplates, workoutTemplateExercises] = await Promise.all([
    getAllExercises(),
    getAllWorkoutTemplates(),
    getAllWorkoutTemplateExercises(),
  ]);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: toolsLabel, item: absoluteUrl(localizePathname("/calculators/", locale)) },
        { "@type": "ListItem", position: 2, name: messages.hero.eyebrow, item: absoluteUrl(pathname) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: messages.hero.eyebrow,
      description: messages.seo.description,
      url: absoluteUrl(pathname),
      applicationCategory: "HealthApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      publisher: { "@type": "Organization", name: "Elevare Fit LLC", url: absoluteUrl("/") },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: messages.faq.items.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <section className="hero tool-hero">
        <div className="eyebrow">{messages.hero.eyebrow}</div>
        <h1>{messages.hero.title}</h1>
        <p className="page-intro">{messages.hero.intro}</p>
        <div className="hero-actions">
          <TrackedLink className="button button-secondary" href={localizePathname("/workouts/", locale)} eventName="cta_click" eventParams={{ cta_name: "Browse workout templates", cta_context: "workout_generator_hero", product: "Logbook" }}>
            {messages.hero.browseWorkouts}
          </TrackedLink>
          <TrackedLink className="button button-secondary" href={localizePathname("/exercises/", locale)} eventName="cta_click" eventParams={{ cta_name: "Browse exercises", cta_context: "workout_generator_hero", product: "Logbook" }}>
            {messages.hero.browseExercises}
          </TrackedLink>
        </div>
      </section>

      <section className="section">
        <article className="callout">
          <span className="meta-pill">{messages.howItWorks.label}</span>
          <h2>{messages.howItWorks.title}</h2>
          <div className="tool-copy-stack">
            {messages.howItWorks.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </article>
      </section>

      {workoutTemplates.length > 0 ? (
        <WorkoutRecommendationTool
          exercises={exercises}
          workoutTemplates={workoutTemplates}
          workoutTemplateExercises={workoutTemplateExercises}
          locale={locale}
        />
      ) : (
        <section className="section">
          <article className="callout">
            <span className="meta-pill">{messages.syncing.label}</span>
            <h2>{messages.syncing.title}</h2>
            <p>{messages.syncing.copy}</p>
          </article>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">{messages.related.eyebrow}</div>
          <h2 className="section-title">{messages.related.title}</h2>
          <p className="section-copy">{messages.related.copy}</p>
        </div>
        <div className="tool-index-grid">
          {messages.related.cards.map((card) => (
            <article key={card.href} className="panel tool-index-card">
              <span className="meta-pill">{card.label}</span>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
              <TrackedLink className="button button-secondary" href={localizePathname(card.href, locale)} eventName={card.href.includes("calculator") ? "tool_open" : "cta_click"} eventParams={{ cta_name: card.action, cta_context: "workout_generator_related_links" }}>
                {card.action}
              </TrackedLink>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">{messages.faq.eyebrow}</div>
          <h2 className="section-title">{messages.faq.title}</h2>
          <p className="section-copy">{messages.faq.copy}</p>
        </div>
        <div className="tool-faq-grid">
          {messages.faq.items.map((faq) => <article key={faq.question} className="panel tool-faq-card"><h3>{faq.question}</h3><p>{faq.answer}</p></article>)}
        </div>
      </section>

      <section className="section"><TrainingDisclaimer locale={locale} /></section>
      <TrainingLogbookCta title={messages.cta.title} description={messages.cta.copy} ctaContext="workout_generator_cta" locale={locale} />
    </div>
  );
}
