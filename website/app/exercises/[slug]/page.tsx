import { notFound } from "next/navigation";
import { StructuredData } from "@/components/StructuredData";
import { ExerciseCard } from "@/components/training/ExerciseCard";
import { TrainingLogbookCta } from "@/components/training/TrainingLogbookCta";
import { WorkoutTemplateCard } from "@/components/training/WorkoutTemplateCard";
import { TrackedLink } from "@/components/TrackedLink";
import { buildMetadata, absoluteUrl } from "@/lib/site";
import { getAllExercises, getAllWorkoutTemplateExercises, getAllWorkoutTemplates, getExerciseBySlug } from "@/lib/training";
import {
  buildExerciseFaqs,
  buildExerciseSummary,
  formatDifficultyLabel,
  formatEquipmentLabel,
  formatExerciseTypeLabel,
  formatMovementPatternLabel,
  formatMuscleLabel,
  getExerciseCategoryInfo,
  getExerciseSubstitutions,
  getExerciseVariations,
  getExercisesByCategorySlug,
  getRelatedExercises,
  getRelatedWorkoutTemplatesForExercise,
  isExerciseCategorySlug,
} from "@/lib/training-data";

type ExercisePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  const exercises = await getAllExercises();

  return [
    ...exercises.map((exercise) => ({
      slug: exercise.slug,
    })),
    ...[
      "chest",
      "back",
      "legs",
      "shoulders",
      "arms",
      "core",
      "glutes",
      "barbell",
      "dumbbell",
      "cable",
      "machine",
      "bodyweight",
      "kettlebell",
    ].map((slug) => ({ slug })),
  ];
}

export async function generateMetadata({ params }: ExercisePageProps) {
  const { slug } = await params;

  if (isExerciseCategorySlug(slug)) {
    const category = getExerciseCategoryInfo(slug);

    if (!category) {
      return buildMetadata({
        title: "Exercise category not found",
        description: "The requested exercise category could not be found.",
        pathname: `/exercises/${slug}`,
      });
    }

    return buildMetadata({
      title: category.title,
      description: category.description,
      pathname: `/exercises/${slug}`,
    });
  }

  const exercise = await getExerciseBySlug(slug);

  if (!exercise) {
    return buildMetadata({
      title: "Exercise not found",
      description: "The requested exercise could not be found.",
      pathname: `/exercises/${slug}`,
    });
  }

  return buildMetadata({
    title: exercise.seoTitle ?? exercise.name,
    description: exercise.seoDescription ?? buildExerciseSummary(exercise),
    pathname: `/exercises/${exercise.slug}`,
  });
}

function buildExerciseStructuredData(slug: string, title: string, faqs: ReturnType<typeof buildExerciseFaqs>) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Exercises",
          item: absoluteUrl("/exercises"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: title,
          item: absoluteUrl(`/exercises/${slug}`),
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

async function ExerciseCategoryPage({ slug }: { slug: string }) {
  const [exercises, workoutTemplates] = await Promise.all([getAllExercises(), getAllWorkoutTemplates()]);
  const category = getExerciseCategoryInfo(slug);

  if (!category) {
    notFound();
  }

  const categoryExercises = getExercisesByCategorySlug(exercises, slug);
  const relatedWorkouts =
    category.kind === "muscle"
      ? workoutTemplates.filter((template) => template.targetMuscleGroups.includes(slug)).slice(0, 4)
      : workoutTemplates.filter((template) => template.equipment.includes(slug)).slice(0, 4);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.title,
    url: absoluteUrl(`/exercises/${slug}`),
    description: category.description,
  };

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <section className="hero">
        <div className="eyebrow">{category.kind === "muscle" ? "Muscle group" : "Equipment"}</div>
        <h1>{category.title}</h1>
        <p className="page-intro">{category.description}</p>
        <div className="hero-proof">
          <article className="proof-card">
            <span className="proof-label">Results</span>
            <div className="proof-value">{categoryExercises.length.toLocaleString()}</div>
            <p className="proof-copy">Exercises currently listed in this category.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Use case</span>
            <div className="proof-value">Find your next option</div>
            <p className="proof-copy">Compare similar movements without searching the entire database again.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Track it</span>
            <div className="proof-value">Built for Logbook</div>
            <p className="proof-copy">Find the exercise, then take it into Logbook for real training history.</p>
          </article>
        </div>
      </section>

      <section className="section">
        {categoryExercises.length > 0 ? (
          <div className="training-grid">
            {categoryExercises.map((exercise) => (
              <ExerciseCard
                key={exercise.slug}
                exercise={exercise}
                sourcePage={`exercise_category_${category.slug}`}
              />
            ))}
          </div>
        ) : (
          <article className="callout">
            <span className="meta-pill">No exercises yet</span>
            <h2>This category is ready, but the public data is still syncing.</h2>
            <p>Once the Supabase exercise library finishes syncing, the exercises for this category will appear here.</p>
          </article>
        )}
      </section>

      {relatedWorkouts.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">Related workouts</div>
            <h2 className="section-title">Workout templates that use this category often.</h2>
            <p className="section-copy">
              These templates are a good next step if you want to turn the exercise category into a full session.
            </p>
          </div>

          <div className="training-grid">
            {relatedWorkouts.map((workoutTemplate) => (
              <WorkoutTemplateCard
                key={workoutTemplate.slug}
                workoutTemplate={workoutTemplate}
                sourcePage={`exercise_category_${category.slug}_related_workouts`}
              />
            ))}
          </div>
        </section>
      ) : null}

      <TrainingLogbookCta
        title="Track this exercise category for free in Logbook."
        description="Once you know the exercises you want to repeat, use Logbook to save the work, review progress, and make cleaner training decisions."
        ctaContext={`exercise_category_${category.slug}`}
      />
    </div>
  );
}

async function ExerciseDetailPage({ slug }: { slug: string }) {
  const [exercise, exercises, workoutTemplates, workoutTemplateExercises] = await Promise.all([
    getExerciseBySlug(slug),
    getAllExercises(),
    getAllWorkoutTemplates(),
    getAllWorkoutTemplateExercises(),
  ]);

  if (!exercise) {
    notFound();
  }

  const faqs = buildExerciseFaqs(exercise);
  const relatedExercises = getRelatedExercises(exercise, exercises, 4);
  const variations = getExerciseVariations(exercise, exercises, 3);
  const alternatives = getExerciseSubstitutions(exercise, exercises, 3);
  const relatedWorkouts = getRelatedWorkoutTemplatesForExercise(
    exercise,
    workoutTemplates,
    workoutTemplateExercises,
    4,
  );

  const structuredData = buildExerciseStructuredData(slug, exercise.name, faqs);

  return (
    <div className="container">
      <StructuredData data={structuredData} />

      <section className="hero">
        <div className="eyebrow">Exercise guide</div>
        <h1>{exercise.name}</h1>
        <p className="page-intro">{exercise.seoDescription ?? buildExerciseSummary(exercise)}</p>
        <div className="hero-proof">
          <article className="proof-card">
            <span className="proof-label">Primary muscle</span>
            <div className="proof-value">{formatMuscleLabel(exercise.primaryMuscleGroup)}</div>
            <p className="proof-copy">The main area this variation is designed to train.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Equipment</span>
            <div className="proof-value">
              {exercise.equipment.length > 0 ? exercise.equipment.map(formatEquipmentLabel).join(", ") : "Minimal"}
            </div>
            <p className="proof-copy">Use this to decide whether the movement fits your current setup.</p>
          </article>
          <article className="proof-card">
            <span className="proof-label">Difficulty</span>
            <div className="proof-value">{formatDifficultyLabel(exercise.difficulty)}</div>
            <p className="proof-copy">A quick checkpoint for how simple or technical the movement usually feels.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="grid-3">
          <article className="panel">
            <span className="stat-label">Muscles worked</span>
            <h3>{formatMuscleLabel(exercise.primaryMuscleGroup)}</h3>
            <p>
              Secondary support can come from{" "}
              {exercise.secondaryMuscleGroups.length > 0
                ? exercise.secondaryMuscleGroups.map((group) => formatMuscleLabel(group)).join(", ")
                : "other nearby stabilizers depending on how you perform the movement"}
              .
            </p>
          </article>
          <article className="panel">
            <span className="stat-label">Exercise type</span>
            <h3>{formatExerciseTypeLabel(exercise.exerciseType)}</h3>
            <p>
              Movement pattern: {formatMovementPatternLabel(exercise.movementPattern).toLowerCase()}.{" "}
              {exercise.isCompound ? "This is a compound exercise." : "This is more of an isolation-focused exercise."}
            </p>
          </article>
          <article className="panel">
            <span className="stat-label">Best for</span>
            <h3>Learning and repeating well</h3>
            <p>
              Use this page to understand the setup first, then track the movement consistently in Logbook once
              it fits your program.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <article className="panel tool-copy-card">
          <div className="section-head">
            <div className="eyebrow">Instructions</div>
            <h2 className="section-title">How to do {exercise.name}</h2>
            <p className="section-copy">
              Keep the setup simple, use a controlled pace, and repeat the same movement pattern each rep.
            </p>
          </div>

          <ol className="article-body">
            {exercise.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
        </article>
      </section>

      <section className="section">
        <div className="tool-faq-grid">
          <article className="panel tool-faq-card">
            <h3>Benefits</h3>
            <ul className="training-list">
              {exercise.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </article>
          <article className="panel tool-faq-card">
            <h3>Common mistakes</h3>
            <ul className="training-list">
              {exercise.commonMistakes.map((mistake) => (
                <li key={mistake}>{mistake}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {(variations.length > 0 || alternatives.length > 0) ? (
        <section className="section">
          <div className="tool-faq-grid">
            <article className="panel tool-faq-card">
              <h3>Variations</h3>
              {variations.length > 0 ? (
                <div className="training-link-list">
                  {variations.map((variation) => (
                    <TrackedLink
                      key={variation.slug}
                      className="nutrition-link-pill"
                      href={`/exercises/${variation.slug}`}
                      eventName="exercise_open"
                      eventParams={{
                        exercise_slug: variation.slug,
                        source_page: `exercise_detail_${exercise.slug}_variations`,
                      }}
                    >
                      {variation.name}
                    </TrackedLink>
                  ))}
                </div>
              ) : (
                <p>More variations will appear here as the public library expands.</p>
              )}
            </article>
            <article className="panel tool-faq-card">
              <h3>Alternatives</h3>
              {alternatives.length > 0 ? (
                <div className="training-link-list">
                  {alternatives.map((alternative) => (
                    <TrackedLink
                      key={alternative.slug}
                      className="nutrition-link-pill"
                      href={`/exercises/${alternative.slug}`}
                      eventName="exercise_open"
                      eventParams={{
                        exercise_slug: alternative.slug,
                        source_page: `exercise_detail_${exercise.slug}_alternatives`,
                      }}
                    >
                      {alternative.name}
                    </TrackedLink>
                  ))}
                </div>
              ) : (
                <p>More equipment-based alternatives will appear here as the library expands.</p>
              )}
            </article>
          </div>
        </section>
      ) : null}

      {relatedWorkouts.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">Related workouts</div>
            <h2 className="section-title">Workout templates that use this exercise.</h2>
            <p className="section-copy">
              If you want to see this movement inside a more complete training session, start here.
            </p>
          </div>

          <div className="training-grid">
            {relatedWorkouts.map((workoutTemplate) => (
              <WorkoutTemplateCard
                key={workoutTemplate.slug}
                workoutTemplate={workoutTemplate}
                sourcePage={`exercise_detail_${exercise.slug}_related_workouts`}
              />
            ))}
          </div>
        </section>
      ) : null}

      {relatedExercises.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div className="eyebrow">Related exercises</div>
            <h2 className="section-title">More exercises in the same lane.</h2>
            <p className="section-copy">
              Use these when you want a similar movement pattern, a different setup, or more exercise options for
              the same target area.
            </p>
          </div>

          <div className="training-grid">
            {relatedExercises.map((relatedExercise) => (
              <ExerciseCard
                key={relatedExercise.slug}
                exercise={relatedExercise}
                sourcePage={`exercise_detail_${exercise.slug}_related_exercises`}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section-head">
          <div className="eyebrow">FAQ</div>
          <h2 className="section-title">Common questions about {exercise.name}.</h2>
          <p className="section-copy">
            Use these answers as a practical starting point, then adjust based on your setup, comfort, and goals.
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
        title="Track this exercise for free in Logbook."
        description="Once the movement is in your plan, use Logbook to record sets, reps, load, and progress without guessing what happened last week."
        ctaContext={`exercise_detail_${exercise.slug}`}
      />
    </div>
  );
}

export default async function ExercisePage({ params }: ExercisePageProps) {
  const { slug } = await params;

  if (isExerciseCategorySlug(slug)) {
    return <ExerciseCategoryPage slug={slug} />;
  }

  return <ExerciseDetailPage slug={slug} />;
}
