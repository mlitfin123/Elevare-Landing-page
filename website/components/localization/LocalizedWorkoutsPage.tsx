import { notFound } from "next/navigation";
import { StructuredData } from "@/components/StructuredData";
import { TrackedLink } from "@/components/TrackedLink";
import { ExerciseCard } from "@/components/training/ExerciseCard";
import { TrainingLogbookCta } from "@/components/training/TrainingLogbookCta";
import { WorkoutDirectory } from "@/components/training/WorkoutDirectory";
import { WorkoutTemplateCard } from "@/components/training/WorkoutTemplateCard";
import {
  localizeDifficultyLabel,
  localizeEquipmentLabel,
  localizeExerciseName,
} from "@/lib/i18n/catalog-content";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber, localizePathname } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/translate";
import {
  getWorkoutMessages,
  localizeWorkoutDayLabel,
  localizeWorkoutGoal,
  localizeWorkoutGoalLabel,
  localizeWorkoutName,
  localizeWorkoutSummary,
} from "@/lib/i18n/workout-content";
import { absoluteUrl } from "@/lib/site";
import {
  getAllExercises,
  getAllWorkoutTemplateExercises,
  getAllWorkoutTemplates,
  getWorkoutTemplateBySlug,
} from "@/lib/training";
import { getPopularWorkoutTemplates } from "@/lib/training-seo";
import {
  WORKOUT_GOALS,
  getExerciseSubstitutions,
  getRelatedExercisesForWorkout,
  getRelatedWorkoutTemplates,
  getWorkoutGoalInfo,
  getWorkoutTemplatesByGoal,
  groupWorkoutExercisesByDay,
  isWorkoutGoalSlug,
  joinTemplateExercises,
} from "@/lib/training-data";

type Props = {
  locale: Locale;
  slug?: string;
};

function WorkoutDisclaimer({ locale }: { locale: Locale }) {
  const messages = getWorkoutMessages(locale).disclaimer;
  return (
    <section className="section">
      <article className="callout">
        <span className="meta-pill">{messages.label}</span>
        <p>{messages.message}</p>
      </article>
    </section>
  );
}

function localizedRest(seconds: number | null, locale: Locale) {
  const messages = getWorkoutMessages(locale).detail;
  if (seconds == null || seconds <= 0) return messages.selfPaced;
  if (seconds < 60) return locale === "es-419" ? `${seconds} s` : locale === "pt-BR" ? `${seconds} s` : `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes} min ${remainder} s` : `${minutes} min`;
}

function localizedSection(section: string | null, locale: Locale) {
  if (!section) return getWorkoutMessages(locale).detail.mainWork;
  const value = section.trim().toLowerCase();
  if (value === "main work" || value === "main") return getWorkoutMessages(locale).detail.mainWork;
  if (value === "warm-up" || value === "warmup") return getWorkoutMessages(locale).detail.warmup;
  if (locale === "es-419" && value === "accessories") return "Accesorios";
  if (locale === "pt-BR" && value === "accessories") return "Acessorios";
  return section;
}

async function WorkoutIndex({ locale }: { locale: Locale }) {
  const templates = await getAllWorkoutTemplates();
  const directoryTemplates = templates.map((template) => ({
    ...template,
    name: localizeWorkoutName(template.name, locale),
    overview: localizeWorkoutSummary(template, locale),
  }));
  const popular = getPopularWorkoutTemplates(templates, 8);
  const messages = getWorkoutMessages(locale);
  const pathname = localizePathname("/workouts/", locale);

  return (
    <div className="container">
      <StructuredData data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: messages.seo.indexTitle,
        url: absoluteUrl(pathname),
        description: messages.seo.indexDescription,
        hasPart: templates.slice(0, 24).map((template, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: localizeWorkoutName(template.name, locale),
          url: absoluteUrl(localizePathname(`/workouts/${template.slug}`, locale)),
        })),
      }} />

      <section className="hero">
        <div className="eyebrow">{messages.index.eyebrow}</div>
        <h1>{messages.index.title}</h1>
        <p className="page-intro">{messages.index.intro}</p>
        <div className="hero-actions">
          <TrackedLink className="button button-primary" href={localizePathname("/exercises/", locale)} eventName="cta_click" eventParams={{ cta_name: "Browse exercises", cta_context: "localized_workouts_hero", product: "Logbook" }}>{messages.index.browseExercises}</TrackedLink>
          <TrackedLink className="button button-secondary" href="/tools/workout-generator/" hrefLang="en" eventName="tool_open" eventParams={{ tool_slug: "workout-generator", source_page: "localized_workouts_hero" }}>{messages.index.useGenerator}</TrackedLink>
        </div>
        <div className="hero-proof">
          <article className="proof-card"><span className="proof-label">{messages.index.templates}</span><div className="proof-value">{formatNumber(templates.length, locale)}</div><p className="proof-copy">{messages.index.templatesCopy}</p></article>
          <article className="proof-card"><span className="proof-label">{messages.index.format}</span><div className="proof-value">{messages.index.formatValue}</div><p className="proof-copy">{messages.index.formatCopy}</p></article>
          <article className="proof-card"><span className="proof-label">{messages.index.track}</span><div className="proof-value">{messages.index.trackValue}</div><p className="proof-copy">{messages.index.trackCopy}</p></article>
        </div>
      </section>

      {popular.length ? (
        <section className="section">
          <div className="section-head"><div className="eyebrow">{messages.index.popularEyebrow}</div><h2 className="section-title">{messages.index.popularTitle}</h2><p className="section-copy">{messages.index.popularCopy}</p></div>
          <div className="training-grid">{popular.map((template) => <WorkoutTemplateCard key={template.slug} workoutTemplate={template} sourcePage="localized_workout_index_popular" locale={locale} />)}</div>
        </section>
      ) : null}

      <section className="section">
        <div className="section-head"><div className="eyebrow">{messages.index.goalsEyebrow}</div><h2 className="section-title">{messages.index.goalsTitle}</h2><p className="section-copy">{messages.index.goalsCopy}</p></div>
        <div className="tool-index-grid">
          {WORKOUT_GOALS.map((goal) => {
            const translated = localizeWorkoutGoal(goal, locale);
            return (
              <article key={goal.slug} className="panel tool-index-card">
                <span className="meta-pill">{translated.label}</span>
                <h3>{translated.title}</h3>
                <p>{translated.description}</p>
                <TrackedLink className="button button-secondary" href={localizePathname(`/workouts/${goal.slug}`, locale)} eventName="workout_goal_open" eventParams={{ goal_slug: goal.slug, source_page: "localized_workout_index_goals" }}>{interpolate(messages.index.exploreGoal, { goal: translated.label.toLocaleLowerCase(locale) })}</TrackedLink>
              </article>
            );
          })}
        </div>
      </section>

      {templates.length ? <WorkoutDirectory workoutTemplates={directoryTemplates} locale={locale} /> : <section className="section"><article className="callout"><span className="meta-pill">{messages.index.emptyLabel}</span><h2>{messages.index.emptyTitle}</h2><p>{messages.index.emptyCopy}</p></article></section>}
      <WorkoutDisclaimer locale={locale} />
      <TrainingLogbookCta title={messages.cta.indexTitle} description={messages.cta.indexCopy} ctaContext="localized_workout_index" locale={locale} />
    </div>
  );
}

async function WorkoutGoal({ locale, slug }: { locale: Locale; slug: string }) {
  const [templates, exercises, templateExercises] = await Promise.all([getAllWorkoutTemplates(), getAllExercises(), getAllWorkoutTemplateExercises()]);
  const canonicalGoal = getWorkoutGoalInfo(slug);
  if (!canonicalGoal) notFound();
  const goal = localizeWorkoutGoal(canonicalGoal, locale);
  const goalTemplates = getWorkoutTemplatesByGoal(templates, slug);
  const related = goalTemplates.length ? getRelatedExercisesForWorkout(goalTemplates[0]!, exercises, templateExercises, 6) : [];
  const messages = getWorkoutMessages(locale);

  return (
    <div className="container">
      <StructuredData data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: goal.title, url: absoluteUrl(localizePathname(`/workouts/${slug}`, locale)), description: goal.description }} />
      <section className="hero"><div className="eyebrow">{messages.goal.eyebrow}</div><h1>{goal.title}</h1><p className="page-intro">{goal.description}</p><div className="hero-proof"><article className="proof-card"><span className="proof-label">{messages.goal.templates}</span><div className="proof-value">{formatNumber(goalTemplates.length, locale)}</div><p className="proof-copy">{messages.goal.templatesCopy}</p></article><article className="proof-card"><span className="proof-label">{messages.goal.startingPoint}</span><div className="proof-value">{messages.goal.startingValue}</div><p className="proof-copy">{messages.goal.startingCopy}</p></article><article className="proof-card"><span className="proof-label">{messages.goal.track}</span><div className="proof-value">{messages.goal.trackValue}</div><p className="proof-copy">{messages.goal.trackCopy}</p></article></div></section>
      <section className="section">{goalTemplates.length ? <div className="training-grid">{goalTemplates.map((template) => <WorkoutTemplateCard key={template.slug} workoutTemplate={template} sourcePage={`localized_workout_goal_${slug}`} prefetch={false} locale={locale} />)}</div> : <article className="callout"><span className="meta-pill">{messages.goal.emptyLabel}</span><h2>{messages.goal.emptyTitle}</h2><p>{messages.goal.emptyCopy}</p></article>}</section>
      {related.length ? <section className="section"><div className="section-head"><div className="eyebrow">{messages.goal.relatedEyebrow}</div><h2 className="section-title">{messages.goal.relatedTitle}</h2><p className="section-copy">{messages.goal.relatedCopy}</p></div><div className="training-grid">{related.map((exercise) => <ExerciseCard key={exercise.slug} exercise={exercise} sourcePage={`localized_workout_goal_${slug}_exercises`} locale={locale} />)}</div></section> : null}
      <WorkoutDisclaimer locale={locale} />
      <TrainingLogbookCta title={messages.cta.goalTitle} description={messages.cta.goalCopy} ctaContext={`localized_workout_goal_${slug}`} locale={locale} />
    </div>
  );
}

async function WorkoutDetail({ locale, slug }: { locale: Locale; slug: string }) {
  const [template, templates, exercises, templateExercises] = await Promise.all([getWorkoutTemplateBySlug(slug), getAllWorkoutTemplates(), getAllExercises(), getAllWorkoutTemplateExercises()]);
  if (!template) notFound();
  const messages = getWorkoutMessages(locale);
  const name = localizeWorkoutName(template.name, locale);
  const goal = localizeWorkoutGoalLabel(template.goal, locale);
  const difficulty = localizeDifficultyLabel(template.difficulty, locale);
  const equipment = template.equipment.length ? template.equipment.map((value) => localizeEquipmentLabel(value, locale)).join(", ") : messages.detail.minimalSetup;
  const joined = joinTemplateExercises(templateExercises, exercises, template.id);
  const days = groupWorkoutExercisesByDay(joined);
  const substitutions = joined.slice(0, 6);
  const relatedExercises = getRelatedExercisesForWorkout(template, exercises, templateExercises, 6);
  const relatedWorkouts = getRelatedWorkoutTemplates(template, templates, 3);
  const faqValues = messages.detail.faqQuestions.map((question, index) => ({
    question: interpolate(question, { name }),
    answer: interpolate(messages.detail.faqAnswers[index], { name, goal: goal.toLocaleLowerCase(locale), difficulty: difficulty.toLocaleLowerCase(locale) }),
  }));
  const pathname = localizePathname(`/workouts/${slug}`, locale);

  return (
    <div className="container">
      <StructuredData data={[{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: messages.index.eyebrow, item: absoluteUrl(localizePathname("/workouts/", locale)) }, { "@type": "ListItem", position: 2, name, item: absoluteUrl(pathname) }] }, { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqValues.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) }]} />
      <section className="hero"><div className="eyebrow">{messages.detail.eyebrow}</div><h1>{name}</h1><p className="page-intro">{localizeWorkoutSummary(template, locale)}</p><div className="hero-proof"><article className="proof-card"><span className="proof-label">{messages.detail.goal}</span><div className="proof-value">{goal}</div><p className="proof-copy">{messages.detail.goalCopy}</p></article><article className="proof-card"><span className="proof-label">{messages.detail.difficulty}</span><div className="proof-value">{difficulty}</div><p className="proof-copy">{messages.detail.difficultyCopy}</p></article><article className="proof-card"><span className="proof-label">{messages.detail.duration}</span><div className="proof-value">{template.estimatedDurationMinutes != null ? `${template.estimatedDurationMinutes} min` : messages.detail.flexible}</div><p className="proof-copy">{messages.detail.durationCopy}</p></article></div></section>
      <section className="section"><div className="grid-3"><article className="panel"><span className="stat-label">{messages.detail.whoFor}</span><h3>{template.experienceLevel ? localizeDifficultyLabel(template.experienceLevel, locale) : messages.detail.generalUsers}</h3><p>{interpolate(messages.detail.whoForCopy, { goal: goal.toLocaleLowerCase(locale), difficulty: difficulty.toLocaleLowerCase(locale) })}</p></article><article className="panel"><span className="stat-label">{messages.detail.equipment}</span><h3>{equipment}</h3><p>{messages.detail.equipmentCopy}</p></article><article className="panel"><span className="stat-label">{messages.detail.trainingDays}</span><h3>{template.trainingDaysPerWeek != null ? interpolate(template.trainingDaysPerWeek === 1 ? messages.detail.dayPerWeek : messages.detail.daysPerWeek, { count: template.trainingDaysPerWeek }) : messages.detail.flexible}</h3><p>{messages.detail.trainingDaysCopy}</p></article></div></section>
      <section className="section"><div className="tool-faq-grid"><article className="panel tool-faq-card"><h3>{messages.detail.warmup}</h3><p>{messages.detail.warmupCopy}</p></article><article className="panel tool-faq-card"><h3>{messages.detail.progression}</h3><p>{messages.detail.progressionCopy}</p></article></div></section>
      {days.length ? <section className="section"><article className="panel training-directory-card"><div className="section-head"><div className="eyebrow">{messages.detail.tableEyebrow}</div><h2 className="section-title">{messages.detail.tableTitle}</h2><p className="section-copy">{messages.detail.tableCopy}</p></div><div className="training-day-stack">{days.map((day) => <div key={day.label} className="training-day-block"><div className="training-day-head"><h3>{localizeWorkoutDayLabel(day.label, locale)}</h3><span>{formatNumber(day.exercises.length, locale)} {day.exercises.length === 1 ? messages.detail.exerciseSingular : messages.detail.exercisePlural}</span></div><div className="training-table-wrap"><table className="training-table"><thead><tr><th>{messages.detail.exercise}</th><th>{messages.detail.section}</th><th>{messages.detail.sets}</th><th>{messages.detail.reps}</th><th>{messages.detail.rest}</th><th>{messages.detail.notes}</th></tr></thead><tbody>{day.exercises.map((entry) => <tr key={entry.id}><td>{entry.exercise ? <TrackedLink className="blog-link" href={localizePathname(`/exercises/${entry.exercise.slug}`, locale)} eventName="exercise_open" eventParams={{ exercise_slug: entry.exercise.slug, source_page: `localized_workout_${slug}_table` }}>{localizeExerciseName(entry.exercise.name, locale)}</TrackedLink> : localizeExerciseName(entry.exerciseName, locale)}</td><td>{localizedSection(entry.section, locale)}</td><td>{entry.sets ?? messages.detail.asWritten}</td><td>{entry.reps ?? messages.detail.asWritten}</td><td>{localizedRest(entry.restSeconds, locale)}</td><td>{messages.detail.followTargets}</td></tr>)}</tbody></table></div></div>)}</div></article></section> : null}
      {substitutions.length ? <section className="section"><div className="section-head"><div className="eyebrow">{messages.detail.substitutionsEyebrow}</div><h2 className="section-title">{messages.detail.substitutionsTitle}</h2><p className="section-copy">{messages.detail.substitutionsCopy}</p></div><div className="tool-faq-grid">{substitutions.map((entry) => { const options = entry.exercise ? getExerciseSubstitutions(entry.exercise, exercises, 2) : []; return <article key={entry.id} className="panel tool-faq-card"><h3>{localizeExerciseName(entry.exercise?.name ?? entry.exerciseName, locale)}</h3>{options.length ? <div className="training-link-list">{options.map((option) => <TrackedLink key={option.slug} className="nutrition-link-pill" href={localizePathname(`/exercises/${option.slug}`, locale)} eventName="exercise_open" eventParams={{ exercise_slug: option.slug, source_page: `localized_workout_${slug}_substitutions` }}>{localizeExerciseName(option.name, locale)}</TrackedLink>)}</div> : <p>{messages.detail.noSubstitution}</p>}</article>; })}</div></section> : null}
      {relatedExercises.length ? <section className="section"><div className="section-head"><div className="eyebrow">{messages.detail.relatedExercisesEyebrow}</div><h2 className="section-title">{messages.detail.relatedExercisesTitle}</h2><p className="section-copy">{messages.detail.relatedExercisesCopy}</p></div><div className="training-grid">{relatedExercises.map((exercise) => <ExerciseCard key={exercise.slug} exercise={exercise} sourcePage={`localized_workout_${slug}_exercises`} locale={locale} />)}</div></section> : null}
      {relatedWorkouts.length ? <section className="section"><div className="section-head"><div className="eyebrow">{messages.detail.relatedWorkoutsEyebrow}</div><h2 className="section-title">{messages.detail.relatedWorkoutsTitle}</h2><p className="section-copy">{messages.detail.relatedWorkoutsCopy}</p></div><div className="training-grid">{relatedWorkouts.map((workout) => <WorkoutTemplateCard key={workout.slug} workoutTemplate={workout} sourcePage={`localized_workout_${slug}_related`} locale={locale} />)}</div></section> : null}
      <section className="section"><div className="section-head"><div className="eyebrow">{messages.detail.faqEyebrow}</div><h2 className="section-title">{interpolate(messages.detail.faqTitle, { name })}</h2></div><div className="tool-faq-grid">{faqValues.map((faq) => <article key={faq.question} className="panel tool-faq-card"><h3>{faq.question}</h3><p>{faq.answer}</p></article>)}</div></section>
      <WorkoutDisclaimer locale={locale} />
      <TrainingLogbookCta title={messages.cta.detailTitle} description={messages.cta.detailCopy} ctaContext={`localized_workout_${slug}`} locale={locale} />
    </div>
  );
}

export async function LocalizedWorkoutsPage({ locale, slug }: Props) {
  if (!slug) return <WorkoutIndex locale={locale} />;
  if (isWorkoutGoalSlug(slug)) return <WorkoutGoal locale={locale} slug={slug} />;
  return <WorkoutDetail locale={locale} slug={slug} />;
}
