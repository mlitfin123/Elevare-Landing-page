import { ProductCtaButtons } from "@/components/ProductCtaButtons";
import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import { WorkoutRecommendationTool } from "@/components/tools/WorkoutRecommendationTool";
import { buildMetadata, absoluteUrl } from "@/lib/site";
import { getAllExercises, getAllWorkoutTemplateExercises, getAllWorkoutTemplates } from "@/lib/training";

export const metadata = buildMetadata({
  title: "Workout Generator | Find the Right Workout for Your Goals",
  description:
    "Answer a few questions and get a personalized workout recommendation based on your goals, experience, schedule, and equipment.",
  pathname: "/tools/workout-generator",
});

const faqs = [
  {
    question: "What workout is best for beginners?",
    answer:
      "Most beginners do best with a simpler full-body or beginner-friendly plan that they can repeat consistently. This tool leans toward easier templates first when you choose beginner experience.",
  },
  {
    question: "How many days per week should I work out?",
    answer:
      "For many people, two to four days per week is enough to make real progress. The best number is the one you can recover from and repeat consistently.",
  },
  {
    question: "Can I build muscle training three days per week?",
    answer:
      "Yes. A well-structured three-day plan can be enough for muscle gain, especially when the sessions cover the main movement patterns and you stay consistent with effort and nutrition.",
  },
  {
    question: "What equipment do I need?",
    answer:
      "That depends on the template. Some workouts are home-friendly and only need bodyweight or dumbbells, while others make better use of a full gym with barbells, cables, and machines.",
  },
  {
    question: "How do I know if a workout is right for me?",
    answer:
      "The plan should match your goal, your experience level, the equipment you actually have, and the number of training days you can realistically commit to each week.",
  },
  {
    question: "Is this an AI workout generator?",
    answer:
      "No. This tool uses deterministic matching rules to recommend from the existing public workout template library. It does not invent a new plan on the fly.",
  },
] as const;

export default async function WorkoutGeneratorPage() {
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
        {
          "@type": "ListItem",
          position: 1,
          name: "Tools",
          item: absoluteUrl("/calculators"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Workout Generator",
          item: absoluteUrl("/tools/workout-generator"),
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Workout Generator",
      description:
        "Answer a few questions and get a workout template recommendation based on your goal, experience, schedule, and equipment.",
      url: absoluteUrl("/tools/workout-generator"),
      applicationCategory: "HealthApplication",
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
      mainEntity: faqs.map((faq) => ({
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
        <div className="eyebrow">Workout Finder</div>
        <h1>Find the right workout plan for your goals without guessing.</h1>
        <p className="page-intro">
          Use this workout generator to match your goal, schedule, equipment, and experience level to a real workout
          template from the Elevare training library.
        </p>
        <div className="hero-actions">
          <TrackedLink
            className="button button-secondary"
            href="/workouts"
            eventName="cta_click"
            eventParams={{
              cta_name: "Browse workout templates",
              cta_context: "workout_generator_hero",
              product: "Logbook",
            }}
          >
            Browse workout templates
          </TrackedLink>
          <TrackedLink
            className="button button-secondary"
            href="/exercises"
            eventName="cta_click"
            eventParams={{
              cta_name: "Browse exercises",
              cta_context: "workout_generator_hero",
              product: "Logbook",
            }}
          >
            Browse exercises
          </TrackedLink>
        </div>
      </section>

      <section className="section">
        <article className="callout">
          <span className="meta-pill">How it works</span>
          <h2>Use the existing workout library instead of starting from scratch.</h2>
          <div className="tool-copy-stack">
            <p>
              This tool is designed for people who know they should probably be following a plan, but are not sure
              which one fits their current situation. Instead of giving you a generic answer like &quot;just do push,
              pull, legs,&quot; it compares your inputs against the public workout templates already available on the
              site.
            </p>
            <p>
              That means the recommendation is grounded in real workout pages you can inspect right away. You can see
              the exercises, sets, reps, rest guidance, and the overall structure before deciding whether it fits your
              week.
            </p>
            <p>
              It is also intentionally simple. This is not an AI coach and it is not trying to write a brand-new
              program from thin air. It is a faster way to narrow the library down to the plans that make the most
              sense for your goal, time, equipment, and training background.
            </p>
          </div>
        </article>
      </section>

      {workoutTemplates.length > 0 ? (
        <WorkoutRecommendationTool
          exercises={exercises}
          workoutTemplates={workoutTemplates}
          workoutTemplateExercises={workoutTemplateExercises}
        />
      ) : (
        <section className="section">
          <article className="callout">
            <span className="meta-pill">Workout generator</span>
            <h2>The workout library is still syncing.</h2>
            <p>
              The page is ready, but the public workout templates are not available in this build yet. Once the
              Supabase data is synced, the recommendation tool will start suggesting templates automatically.
            </p>
          </article>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">Related links</div>
          <h2 className="section-title">Keep exploring the training library.</h2>
          <p className="section-copy">
            Use these next if you want to compare full plans, learn individual exercises, or start tracking in
            Logbook.
          </p>
        </div>

        <div className="tool-index-grid">
          <article className="panel tool-index-card">
            <span className="meta-pill">Workouts</span>
            <h3>Browse all workout templates</h3>
            <p>Compare beginner, weight-loss, muscle-building, and strength templates side by side.</p>
            <TrackedLink
              className="button button-secondary"
              href="/workouts"
              eventName="cta_click"
              eventParams={{
                cta_name: "Browse all workout templates",
                cta_context: "workout_generator_related_links",
              }}
            >
              Explore workouts
            </TrackedLink>
          </article>

          <article className="panel tool-index-card">
            <span className="meta-pill">Exercises</span>
            <h3>Learn the exercises first</h3>
            <p>Open the exercise guides if you want to understand the movements before choosing a full plan.</p>
            <TrackedLink
              className="button button-secondary"
              href="/exercises"
              eventName="cta_click"
              eventParams={{
                cta_name: "Browse exercise library",
                cta_context: "workout_generator_related_links",
              }}
            >
              Browse exercises
            </TrackedLink>
          </article>

          <article className="panel tool-index-card">
            <span className="meta-pill">Logbook</span>
            <h3>Track your training in Logbook</h3>
            <p>Once you find a plan that fits, use Logbook to record the work and review progress over time.</p>
            <TrackedLink
              className="button button-secondary"
              href="/logbook"
              eventName="cta_click"
              eventParams={{
                cta_name: "Open Logbook page",
                cta_context: "workout_generator_related_links",
              }}
            >
              Learn about Logbook
            </TrackedLink>
          </article>

          <article className="panel tool-index-card">
            <span className="meta-pill">Nutrition</span>
            <h3>Pair the plan with a calorie target</h3>
            <p>A better workout plan works even better when your calories and protein target make sense too.</p>
            <TrackedLink
              className="button button-secondary"
              href="/calculators/calorie-calculator"
              eventName="tool_open"
              eventParams={{
                tool_slug: "calorie-calculator",
                source_page: "workout_generator_related_links",
              }}
            >
              Open calorie calculator
            </TrackedLink>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">FAQ</div>
          <h2 className="section-title">Common questions about the workout generator.</h2>
          <p className="section-copy">
            These answers are meant to keep the tool practical and beginner-friendly before you even use it.
          </p>
        </div>

        <div className="tool-faq-grid">
          {faqs.map((faq) => (
            <article key={faq.question} className="panel tool-faq-card">
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <article className="product-cta">
          <span className="meta-pill">Logbook</span>
          <h2>Track your nutrition and workouts for free in Logbook.</h2>
          <p>
            Once you land on a plan that fits your week, Logbook gives you a cleaner place to record sessions,
            review progress, and stay more consistent.
          </p>
          <div className="button-row">
            <ProductCtaButtons product="Logbook" context="workout_generator_cta" />
          </div>
        </article>
      </section>
    </div>
  );
}
