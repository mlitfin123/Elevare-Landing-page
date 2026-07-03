import { notFound } from "next/navigation";
import { StructuredData } from "@/components/StructuredData";
import { ExerciseCard } from "@/components/training/ExerciseCard";
import { RelatedTrainingTools } from "@/components/training/RelatedTrainingTools";
import { TrainingLogbookCta } from "@/components/training/TrainingLogbookCta";
import { WorkoutTemplateCard } from "@/components/training/WorkoutTemplateCard";
import { TrackedLink } from "@/components/TrackedLink";
import { buildMetadata, absoluteUrl } from "@/lib/site";
import {
  getAllExercises,
  getAllWorkoutTemplateExercises,
  getAllWorkoutTemplates,
  getWorkoutTemplateBySlug,
} from "@/lib/training";
import { getWorkoutGoalRelatedToolSlugs, getWorkoutRelatedToolSlugs } from "@/lib/training-seo";
import {
  buildWorkoutFaqs,
  buildWorkoutSummary,
  formatDifficultyLabel,
  formatEquipmentLabel,
  formatGoalLabel,
  formatRestText,
  getExerciseSubstitutions,
  getRelatedExercisesForWorkout,
  getRelatedWorkoutTemplates,
  getWorkoutGoalInfo,
  getWorkoutTemplatesByGoal,
  groupWorkoutExercisesByDay,
  isWorkoutGoalSlug,
  joinTemplateExercises,
} from "@/lib/training-data";

type WorkoutPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  const workoutTemplates = await getAllWorkoutTemplates();

  return [
    ...workoutTemplates.map((workoutTemplate) => ({
      slug: workoutTemplate.slug,
    })),
    ...["weight-loss", "muscle-building", "beginner", "strength"].map((slug) => ({
      slug,
    })),
  ];
}

export async function generateMetadata({ params }: WorkoutPageProps) {
  const { slug } = await params;

  if (isWorkoutGoalSlug(slug)) {
    const goal = getWorkoutGoalInfo(slug);

    if (!goal) {
      return buildMetadata({
        title: "Workout category not found",
        description: "The requested workout category could not be found.",
        pathname: `/workouts/${slug}`,
      });
    }

    return buildMetadata({
      title: goal.title,
      description: goal.description,
      pathname: `/workouts/${slug}`,
    });
  }

  const workoutTemplate = await getWorkoutTemplateBySlug(slug);

  if (!workoutTemplate) {
    return buildMetadata({
      title: "Workout not found",
      description: "The requested workout template could not be found.",
      pathname: `/workouts/${slug}`,
    });
  }

  return buildMetadata({
    title: workoutTemplate.seoTitle ?? workoutTemplate.name,
    description: workoutTemplate.seoDescription ?? buildWorkoutSummary(workoutTemplate),
    pathname: `/workouts/${workoutTemplate.slug}`,
  });
}

async function WorkoutGoalPage({ slug }: { slug: string }) {
  const [workoutTemplates, exercises, workoutTemplateExercises] = await Promise.all([
    getAllWorkoutTemplates(),
    getAllExercises(),
    getAllWorkoutTemplateExercises(),
  ]);
  const goal = getWorkoutGoalInfo(slug);

  if (!goal) {
    notFound();
  }

  const goalTemplates = getWorkoutTemplatesByGoal(workoutTemplates, slug);
  const relatedExercises =
    goalTemplates.length === 0
      ? []
      : getRelatedExercisesForWorkout(goalTemplates[0]!, exercises, workoutTemplateExercises, 6);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: goal.title,
    url: absoluteUrl(`/workouts/${slug}`),
    description: goal.description,
  };

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <section className="hero">
        <div className="eyebrow">Workout goal</div>
        <h1>{goal.title}</h1>
        <p className="page-intro">{goal.description}</p>
        <div className="hero-proof">
          <article className="proof-card">
            <span className="proof-label">Templates</span>
            <div className="proof-value">{goalTemplates.length.toLocaleString()}</div>
            <p className="proof-copy">Workout templates currently listed in this goal category.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Starting point</span>
            <div className="proof-value">Structured sessions</div>
            <p className="proof-copy">Use these pages when you want more structure than random exercise selection.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Track it</span>
            <div className="proof-value">Logbook ready</div>
            <p className="proof-copy">Pick a template, then use Logbook to see how well you actually follow it.</p>
          </article>
        </div>
      </section>

      <section className="section">
        {goalTemplates.length > 0 ? (
          <div className="training-grid">
            {goalTemplates.map((workoutTemplate) => (
              <WorkoutTemplateCard
                key={workoutTemplate.slug}
                workoutTemplate={workoutTemplate}
                sourcePage={`workout_goal_${goal.slug}`}
              />
            ))}
          </div>
        ) : (
          <article className="callout">
            <span className="meta-pill">No templates yet</span>
            <h2>This workout category is ready, but the public template data is still syncing.</h2>
            <p>Once the Supabase workout templates are available in this build, the templates for this goal will appear here.</p>
          </article>
        )}
      </section>

      {relatedExercises.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">Related exercises</div>
            <h2 className="section-title">Exercises commonly used in this goal category.</h2>
            <p className="section-copy">
              Use these exercise pages when you want to understand the movements before adding the full template to
              your training.
            </p>
          </div>

          <div className="training-grid">
            {relatedExercises.map((exercise) => (
              <ExerciseCard key={exercise.slug} exercise={exercise} sourcePage={`workout_goal_${goal.slug}_related_exercises`} />
            ))}
          </div>
        </section>
      ) : null}

      <RelatedTrainingTools
        title={`Helpful calculators for ${goal.label.toLowerCase()} workouts.`}
        description="Use these calculators to turn your workout choice into a more realistic plan for calories, protein, progression, or training structure."
        toolSlugs={getWorkoutGoalRelatedToolSlugs(goal.slug)}
        sourcePage={`workout_goal_${goal.slug}_related_tools`}
      />

      <TrainingLogbookCta
        title="Track this workout goal for free in Logbook."
        description="Once you choose a direction, use Logbook to log the training itself and see which plan you actually stick to."
        ctaContext={`workout_goal_${goal.slug}`}
      />
    </div>
  );
}

function buildWorkoutStructuredData(slug: string, title: string, faqs: ReturnType<typeof buildWorkoutFaqs>) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Workouts",
          item: absoluteUrl("/workouts"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: title,
          item: absoluteUrl(`/workouts/${slug}`),
        },
      ],
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
}

async function WorkoutDetailPage({ slug }: { slug: string }) {
  const [workoutTemplate, workoutTemplates, exercises, workoutTemplateExercises] = await Promise.all([
    getWorkoutTemplateBySlug(slug),
    getAllWorkoutTemplates(),
    getAllExercises(),
    getAllWorkoutTemplateExercises(),
  ]);

  if (!workoutTemplate) {
    notFound();
  }

  const joinedExercises = joinTemplateExercises(workoutTemplateExercises, exercises, workoutTemplate.id);
  const dayGroups = groupWorkoutExercisesByDay(joinedExercises);
  const faqs = buildWorkoutFaqs(workoutTemplate);
  const relatedWorkouts = getRelatedWorkoutTemplates(workoutTemplate, workoutTemplates, 4);
  const relatedExercises = getRelatedExercisesForWorkout(
    workoutTemplate,
    exercises,
    workoutTemplateExercises,
    6,
  );
  const structuredData = buildWorkoutStructuredData(slug, workoutTemplate.name, faqs);

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <section className="hero">
        <div className="eyebrow">Workout template</div>
        <h1>{workoutTemplate.name}</h1>
        <p className="page-intro">{workoutTemplate.overview ?? buildWorkoutSummary(workoutTemplate)}</p>
        <div className="hero-proof">
          <article className="proof-card">
            <span className="proof-label">Goal</span>
            <div className="proof-value">{formatGoalLabel(workoutTemplate.goal)}</div>
            <p className="proof-copy">The main training outcome this template is built around.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Difficulty</span>
            <div className="proof-value">{formatDifficultyLabel(workoutTemplate.difficulty)}</div>
            <p className="proof-copy">A quick way to gauge how simple or advanced the structure feels.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Duration</span>
            <div className="proof-value">
              {workoutTemplate.estimatedDurationMinutes != null
                ? `${workoutTemplate.estimatedDurationMinutes} min`
                : "Flexible"}
            </div>
            <p className="proof-copy">Use this to match the template to your actual weekly schedule.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="grid-3">
          <article className="panel">
            <span className="stat-label">Who it is for</span>
            <h3>{workoutTemplate.experienceLevel ? formatDifficultyLabel(workoutTemplate.experienceLevel) : "General users"}</h3>
            <p>
              {workoutTemplate.whoItIsFor ??
                "This template works best for people who want a clearer plan without writing every session from scratch."}
            </p>
          </article>
          <article className="panel">
            <span className="stat-label">Equipment</span>
            <h3>
              {workoutTemplate.equipment.length > 0
                ? workoutTemplate.equipment.map(formatEquipmentLabel).join(", ")
                : "Minimal setup"}
            </h3>
            <p>These are the main tools you will usually need to run the workout as written.</p>
          </article>
          <article className="panel">
            <span className="stat-label">Training days</span>
            <h3>
              {workoutTemplate.trainingDaysPerWeek != null
                ? `${workoutTemplate.trainingDaysPerWeek} day${workoutTemplate.trainingDaysPerWeek === 1 ? "" : "s"} / week`
                : "Flexible"}
            </h3>
            <p>Use this to decide whether the template fits the time you can realistically train each week.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="tool-faq-grid">
          <article className="panel tool-faq-card">
            <h3>Warm-up guidance</h3>
            <p>{workoutTemplate.warmupGuidance ?? "Start each session with a short general warm-up and lighter sets before the first main lift."}</p>
          </article>
          <article className="panel tool-faq-card">
            <h3>Progression guidance</h3>
            <p>{workoutTemplate.progressionGuidance ?? "Progress the plan gradually by improving reps, load, or consistency one step at a time."}</p>
          </article>
        </div>
      </section>

      <section className="section">
        <article className="panel training-directory-card">
          <div className="section-head">
            <div className="eyebrow">Exercise table</div>
            <h2 className="section-title">What this workout includes.</h2>
            <p className="section-copy">
              Use the table below to see each exercise, how it is organized, and the basic set, rep, and rest
              guidance.
            </p>
          </div>

          <div className="training-day-stack">
            {dayGroups.map((day) => (
              <div key={day.label} className="training-day-block">
                <div className="training-day-head">
                  <h3>{day.label}</h3>
                  <span>{day.exercises.length} exercise{day.exercises.length === 1 ? "" : "s"}</span>
                </div>

                <div className="training-table-wrap">
                  <table className="training-table">
                    <thead>
                      <tr>
                        <th>Exercise</th>
                        <th>Section</th>
                        <th>Sets</th>
                        <th>Reps</th>
                        <th>Rest</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.exercises.map((entry) => (
                        <tr key={entry.id}>
                          <td>
                            {entry.exercise ? (
                              <TrackedLink
                                className="blog-link"
                                href={`/exercises/${entry.exercise.slug}`}
                                eventName="exercise_open"
                                eventParams={{
                                  exercise_slug: entry.exercise.slug,
                                  source_page: `workout_detail_${workoutTemplate.slug}_table`,
                                }}
                              >
                                {entry.exercise.name}
                              </TrackedLink>
                            ) : (
                              entry.exerciseName
                            )}
                          </td>
                          <td>{entry.section ?? "Main work"}</td>
                          <td>{entry.sets ?? "As written"}</td>
                          <td>{entry.reps ?? "As written"}</td>
                          <td>{formatRestText(entry.restSeconds)}</td>
                          <td>{entry.notes ?? "Focus on clean, repeatable reps."}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {joinedExercises.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">Exercise substitutions</div>
            <h2 className="section-title">Simple swaps if you need another option.</h2>
            <p className="section-copy">
              These substitutions stay in the same general lane so you can adjust the workout without rebuilding it
              from scratch.
            </p>
          </div>

          <div className="tool-faq-grid">
            {joinedExercises.slice(0, 6).map((entry) => {
              const substitutions = entry.exercise ? getExerciseSubstitutions(entry.exercise, exercises, 2) : [];

              return (
                <article key={entry.id} className="panel tool-faq-card">
                  <h3>{entry.exercise?.name ?? entry.exerciseName}</h3>
                  {substitutions.length > 0 ? (
                    <div className="training-link-list">
                      {substitutions.map((substitution) => (
                        <TrackedLink
                          key={substitution.slug}
                          className="nutrition-link-pill"
                          href={`/exercises/${substitution.slug}`}
                          eventName="exercise_open"
                          eventParams={{
                            exercise_slug: substitution.slug,
                            source_page: `workout_detail_${workoutTemplate.slug}_substitutions`,
                          }}
                        >
                          {substitution.name}
                        </TrackedLink>
                      ))}
                    </div>
                  ) : (
                    <p>Use a similar movement pattern and equipment setup if you need to make a change.</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {relatedExercises.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">Related exercises</div>
            <h2 className="section-title">Learn the main movements before you run the template.</h2>
            <p className="section-copy">
              These exercise pages help you understand the lifts, machines, and accessories that show up most in
              this workout.
            </p>
          </div>

          <div className="training-grid">
            {relatedExercises.map((exercise) => (
              <ExerciseCard key={exercise.slug} exercise={exercise} sourcePage={`workout_detail_${workoutTemplate.slug}_related_exercises`} />
            ))}
          </div>
        </section>
      ) : null}

      {relatedWorkouts.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">Related workouts</div>
            <h2 className="section-title">More templates built for a similar goal.</h2>
            <p className="section-copy">
              Compare these if you want a different split, a different equipment setup, or another template in the
              same general direction.
            </p>
          </div>

          <div className="training-grid">
            {relatedWorkouts.map((relatedWorkout) => (
              <WorkoutTemplateCard
                key={relatedWorkout.slug}
                workoutTemplate={relatedWorkout}
                sourcePage={`workout_detail_${workoutTemplate.slug}_related_workouts`}
              />
            ))}
          </div>
        </section>
      ) : null}

      <RelatedTrainingTools
        title="Related calculators for this workout."
        description="Use these tools when you want to turn the workout into a clearer calorie target, protein target, strength checkpoint, or training-volume plan."
        toolSlugs={getWorkoutRelatedToolSlugs(workoutTemplate)}
        sourcePage={`workout_detail_${workoutTemplate.slug}_related_tools`}
      />

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">FAQ</div>
          <h2 className="section-title">Common questions about {workoutTemplate.name}.</h2>
          <p className="section-copy">
            Use these quick answers as a starting point, then compare the plan to your real schedule, equipment,
            and recovery.
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

      <TrainingLogbookCta
        title="Track this workout for free in Logbook."
        description="Once you start running the template, use Logbook to save the sets, reps, and exercise history that tell you whether the plan is really working."
        ctaContext={`workout_detail_${workoutTemplate.slug}`}
      />
    </div>
  );
}

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  const { slug } = await params;

  if (isWorkoutGoalSlug(slug)) {
    return <WorkoutGoalPage slug={slug} />;
  }

  return <WorkoutDetailPage slug={slug} />;
}
