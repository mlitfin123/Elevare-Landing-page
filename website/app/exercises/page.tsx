import { StructuredData } from "@/components/StructuredData";
import { ExerciseDirectory } from "@/components/training/ExerciseDirectory";
import { TrainingLogbookCta } from "@/components/training/TrainingLogbookCta";
import { TrackedLink } from "@/components/TrackedLink";
import { getAllExercises } from "@/lib/training";
import {
  EXERCISE_EQUIPMENT_CATEGORIES,
  EXERCISE_MUSCLE_CATEGORIES,
  formatEquipmentLabel,
  formatMuscleLabel,
} from "@/lib/training-data";
import { absoluteUrl, buildMetadata } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Exercise Database",
  description:
    "Explore a beginner-friendly exercise database with muscles worked, equipment, instructions, and related workout templates.",
  pathname: "/exercises",
});

export default async function ExercisesIndexPage() {
  const exercises = await getAllExercises();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Elevare Exercise Database",
    url: absoluteUrl("/exercises"),
    description:
      "A searchable exercise database with muscles worked, equipment, instructions, and related workout templates.",
    hasPart: exercises.slice(0, 24).map((exercise, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: exercise.name,
      url: absoluteUrl(`/exercises/${exercise.slug}`),
    })),
  };

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <section className="hero">
        <div className="eyebrow">Exercises</div>
        <h1>Browse exercises by muscle group, equipment, and movement.</h1>
        <p className="page-intro">
          Explore beginner-friendly exercise pages with instructions, benefits, common mistakes, and related
          workouts you can track in Logbook.
        </p>
        <div className="hero-actions">
          <TrackedLink
            className="button button-primary"
            href="/workouts"
            eventName="cta_click"
            eventParams={{
              cta_name: "Browse workouts",
              cta_context: "exercises_hero",
              product: "Logbook",
            }}
          >
            Browse workout templates
          </TrackedLink>
          <TrackedLink
            className="button button-secondary"
            href="/logbook"
            eventName="cta_click"
            eventParams={{
              cta_name: "See Logbook",
              cta_context: "exercises_hero",
              product: "Logbook",
            }}
          >
            Learn about Logbook
          </TrackedLink>
        </div>

        <div className="hero-proof">
          <article className="proof-card">
            <span className="proof-label">Exercises</span>
            <div className="proof-value">{exercises.length.toLocaleString()}</div>
            <p className="proof-copy">Public movements available in the current exercise library.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Category links</span>
            <div className="proof-value">Muscle + equipment</div>
            <p className="proof-copy">Jump directly into chest, back, legs, dumbbell, barbell, and more.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Use case</span>
            <div className="proof-value">Training clarity</div>
            <p className="proof-copy">Find the movement, learn the basics, and track it inside Logbook.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">Muscle groups</div>
          <h2 className="section-title">Start with what you want to train.</h2>
          <p className="section-copy">
            Browse curated category pages for the main muscle groups most people search first.
          </p>
        </div>

        <div className="tool-index-grid">
          {EXERCISE_MUSCLE_CATEGORIES.map((category) => (
            <article key={category.slug} className="panel tool-index-card">
              <span className="meta-pill">{formatMuscleLabel(category.slug)}</span>
              <h3>{category.title}</h3>
              <p>{category.description}</p>
              <TrackedLink
                className="button button-secondary"
                href={`/exercises/${category.slug}`}
                eventName="exercise_category_open"
                eventParams={{
                  category_slug: category.slug,
                  source_page: "exercise_index_muscle_categories",
                }}
              >
                Explore {category.label.toLowerCase()} exercises
              </TrackedLink>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">Equipment</div>
          <h2 className="section-title">Filter the library by what you have available.</h2>
          <p className="section-copy">
            These pages help you find useful exercise options whether you train with barbells, dumbbells,
            cables, machines, or just bodyweight.
          </p>
        </div>

        <div className="tool-index-grid">
          {EXERCISE_EQUIPMENT_CATEGORIES.map((category) => (
            <article key={category.slug} className="panel tool-index-card">
              <span className="meta-pill">{formatEquipmentLabel(category.slug)}</span>
              <h3>{category.title}</h3>
              <p>{category.description}</p>
              <TrackedLink
                className="button button-secondary"
                href={`/exercises/${category.slug}`}
                eventName="exercise_category_open"
                eventParams={{
                  category_slug: category.slug,
                  source_page: "exercise_index_equipment_categories",
                }}
              >
                Explore {category.label.toLowerCase()} exercises
              </TrackedLink>
            </article>
          ))}
        </div>
      </section>

      {exercises.length > 0 ? (
        <ExerciseDirectory exercises={exercises} />
      ) : (
        <section className="section">
          <article className="callout">
            <span className="meta-pill">Exercise library</span>
            <h2>The public exercise database is being refreshed.</h2>
            <p>
              The page structure is live, but the Supabase exercise records are not available in this build yet.
              Once the library is synced, this directory will automatically populate.
            </p>
          </article>
        </section>
      )}

      <TrainingLogbookCta
        title="Want to track your exercises for free in Logbook?"
        description="Use Logbook to record sets, reps, weights, and workout history once you find the movements you want to keep repeating."
        ctaContext="exercise_index"
      />
    </div>
  );
}
