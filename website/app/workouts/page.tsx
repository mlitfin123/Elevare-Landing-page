import { StructuredData } from "@/components/StructuredData";
import { TrainingLogbookCta } from "@/components/training/TrainingLogbookCta";
import { WorkoutDirectory } from "@/components/training/WorkoutDirectory";
import { TrackedLink } from "@/components/TrackedLink";
import { buildMetadata, absoluteUrl } from "@/lib/site";
import { getAllWorkoutTemplates } from "@/lib/training";
import { getPopularWorkoutTemplates } from "@/lib/training-seo";
import { formatGoalLabel, WORKOUT_GOALS } from "@/lib/training-data";
import { WorkoutTemplateCard } from "@/components/training/WorkoutTemplateCard";

export const metadata = buildMetadata({
  title: "Workout Templates",
  description:
    "Explore beginner, muscle-building, weight-loss, and strength workout templates with exercises, sets, reps, and rest guidance.",
  pathname: "/workouts",
});

export default async function WorkoutsIndexPage() {
  const workoutTemplates = await getAllWorkoutTemplates();
  const popularWorkouts = getPopularWorkoutTemplates(workoutTemplates, 8);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Elevare Workout Templates",
    url: absoluteUrl("/workouts"),
    description: "A collection of public workout templates with exercises, set and rep guidance, and related links.",
    hasPart: workoutTemplates.slice(0, 24).map((template, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: template.name,
      url: absoluteUrl(`/workouts/${template.slug}`),
    })),
  };

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <section className="hero">
        <div className="eyebrow">Workouts</div>
        <h1>Find workout templates you can actually use and repeat.</h1>
        <p className="page-intro">
          Browse structured workout templates for beginners, fat loss, muscle building, and strength training,
          then use Logbook to track the plan over time.
        </p>
        <div className="hero-actions">
          <TrackedLink
            className="button button-primary"
            href="/exercises"
            eventName="cta_click"
            eventParams={{
              cta_name: "Browse exercises",
              cta_context: "workouts_hero",
              product: "Logbook",
            }}
          >
            Browse exercises
          </TrackedLink>
          <TrackedLink
            className="button button-secondary"
            href="/tools/workout-generator"
            eventName="tool_open"
            eventParams={{
              tool_slug: "workout-generator",
              source_page: "workouts_hero",
            }}
          >
            Use workout generator
          </TrackedLink>
        </div>

        <div className="hero-proof">
          <article className="proof-card">
            <span className="proof-label">Templates</span>
            <div className="proof-value">{workoutTemplates.length.toLocaleString()}</div>
            <p className="proof-copy">Public workout templates currently available in the library.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Format</span>
            <div className="proof-value">Exercises, sets, reps, rest</div>
            <p className="proof-copy">Use the templates as a clear starting point instead of guessing every session.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Track it</span>
            <div className="proof-value">Built for Logbook</div>
            <p className="proof-copy">Take the plan into Logbook so you can see what you actually did over time.</p>
          </article>
        </div>
      </section>

      {popularWorkouts.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">Popular workout templates</div>
            <h2 className="section-title">Start with the workout templates most people can use immediately.</h2>
            <p className="section-copy">
              These are the strongest starting points in the public workout library if you want a plan before you
              sort through every template in the database.
            </p>
          </div>

          <div className="training-grid">
            {popularWorkouts.map((workoutTemplate) => (
              <WorkoutTemplateCard
                key={workoutTemplate.slug}
                workoutTemplate={workoutTemplate}
                sourcePage="workout_index_popular_templates"
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">Goal categories</div>
          <h2 className="section-title">Start with the outcome you want.</h2>
          <p className="section-copy">
            Jump into the workout category that best matches your current goal, then narrow down from there.
          </p>
        </div>

        <div className="tool-index-grid">
          {WORKOUT_GOALS.map((goal) => (
            <article key={goal.slug} className="panel tool-index-card">
              <span className="meta-pill">{formatGoalLabel(goal.slug)}</span>
              <h3>{goal.title}</h3>
              <p>{goal.description}</p>
              <TrackedLink
                className="button button-secondary"
                href={`/workouts/${goal.slug}`}
                eventName="workout_goal_open"
                eventParams={{
                  goal_slug: goal.slug,
                  source_page: "workout_index_goal_categories",
                }}
              >
                Explore {goal.label.toLowerCase()} workouts
              </TrackedLink>
            </article>
          ))}
        </div>
      </section>

      {workoutTemplates.length > 0 ? (
        <WorkoutDirectory workoutTemplates={workoutTemplates} />
      ) : (
        <section className="section">
          <article className="callout">
            <span className="meta-pill">Workout templates</span>
            <h2>The public workout library is being refreshed.</h2>
            <p>
              The page structure is live, but the public workout templates are not available in this build yet.
              Once the Supabase records are synced, this directory will populate automatically.
            </p>
          </article>
        </section>
      )}

      <TrainingLogbookCta
        title="Want to track your workouts for free in Logbook?"
        description="Use Logbook to turn these templates into real training history with logged sets, reps, and exercise progress."
        ctaContext="workout_index"
      />
    </div>
  );
}
