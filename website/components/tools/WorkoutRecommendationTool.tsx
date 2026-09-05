"use client";

import { useState } from "react";
import { TrackedLink } from "@/components/TrackedLink";
import {
  Field,
  FormActions,
  FormError,
  ResultCard,
  ResultGrid,
  ResultMetric,
  SelectInput,
  ToolFormCard,
} from "@/components/tools/ToolCalculatorUi";
import { WorkoutTemplateCard } from "@/components/training/WorkoutTemplateCard";
import { useWorkoutRecommendationActions } from "@/hooks/useWorkoutRecommendationActions";
import {
  localizeDifficultyLabel,
  localizeEquipmentLabel,
  localizeExerciseName,
  localizeExerciseText,
} from "@/lib/i18n/catalog-content";
import { localizePathname, type Locale } from "@/lib/i18n/config";
import {
  getWorkoutGeneratorMessages,
  localizeWorkoutRecommendationReason,
} from "@/lib/i18n/workout-generator-content";
import {
  localizeWorkoutDayLabel,
  localizeWorkoutGoalLabel,
  localizeWorkoutName,
  localizeWorkoutSummary,
} from "@/lib/i18n/workout-content";
import {
  getWorkoutGeneratorGoalBrowsePath,
  recommendWorkoutTemplates,
  WORKOUT_GENERATOR_DAY_OPTIONS,
  WORKOUT_GENERATOR_DURATION_OPTIONS,
  WORKOUT_GENERATOR_EQUIPMENT_OPTIONS,
  WORKOUT_GENERATOR_EXPERIENCE_LEVELS,
  WORKOUT_GENERATOR_FOCUS_OPTIONS,
  WORKOUT_GENERATOR_GOALS,
  type WorkoutGeneratorDuration,
  type WorkoutGeneratorEquipment,
  type WorkoutGeneratorExperience,
  type WorkoutGeneratorFocus,
  type WorkoutGeneratorGoal,
} from "@/lib/workout-recommendations";
import {
  buildWorkoutSummary,
  formatDifficultyLabel,
  formatEquipmentLabel,
  formatGoalLabel,
  formatRestText,
  groupWorkoutExercisesByDay,
  joinTemplateExercises,
  type ExerciseRecord,
  type WorkoutTemplateExerciseRecord,
  type WorkoutTemplateRecord,
} from "@/lib/training-data";

type WorkoutRecommendationToolProps = {
  exercises: ExerciseRecord[];
  workoutTemplates: WorkoutTemplateRecord[];
  workoutTemplateExercises: WorkoutTemplateExerciseRecord[];
  locale?: Locale;
};

function formatPreviewRest(seconds: number | null, locale: Locale, fallback: string) {
  if (seconds == null || seconds <= 0) return fallback;
  if (locale === "en") return formatRestText(seconds);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes} min ${remainder} s` : `${minutes} min`;
}

function localizePreviewSection(section: string | null, locale: Locale, fallback: string) {
  if (!section) return fallback;
  if (locale === "en") return section;
  const normalized = section.trim().toLowerCase();
  if (normalized === "main" || normalized === "main work") return fallback;
  if (normalized === "warm-up" || normalized === "warmup") return locale === "es-419" ? "Calentamiento" : "Aquecimento";
  if (normalized === "accessories") return locale === "es-419" ? "Accesorios" : "Acessorios";
  if (normalized === "cool-down" || normalized === "cooldown") return locale === "es-419" ? "Vuelta a la calma" : "Volta a calma";
  return section;
}

export function WorkoutRecommendationTool({
  exercises,
  workoutTemplates,
  workoutTemplateExercises,
  locale = "en",
}: WorkoutRecommendationToolProps) {
  const messages = getWorkoutGeneratorMessages(locale).tool;
  const [goal, setGoal] = useState<WorkoutGeneratorGoal>("general-fitness");
  const [experience, setExperience] = useState<WorkoutGeneratorExperience>("beginner");
  const [equipment, setEquipment] = useState<WorkoutGeneratorEquipment>("home");
  const [daysPerWeek, setDaysPerWeek] = useState("3");
  const [workoutDuration, setWorkoutDuration] = useState<WorkoutGeneratorDuration>("30-45");
  const [focusArea, setFocusArea] = useState<WorkoutGeneratorFocus | "none">("none");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof recommendWorkoutTemplates> | null>(null);
  const actions = useWorkoutRecommendationActions();

  const recommendedCandidate = result?.recommended ?? null;
  const recommendedTemplate = recommendedCandidate?.template ?? null;
  const alternativeTemplates = result?.alternatives ?? [];
  const previewRows = recommendedTemplate
    ? groupWorkoutExercisesByDay(
        joinTemplateExercises(workoutTemplateExercises, exercises, recommendedTemplate.id),
      )
    : [];
  const browsePath = getWorkoutGeneratorGoalBrowsePath(recommendedTemplate?.goal ?? null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedDays = Number(daysPerWeek);

    if (!Number.isFinite(parsedDays) || parsedDays < 2) {
      setError(messages.invalidDays);
      setResult(null);
      return;
    }

    actions.clearFeedback();

    const nextResult = recommendWorkoutTemplates(
      {
        goal,
        experience,
        equipment,
        daysPerWeek: parsedDays,
        workoutDuration,
        focusArea: focusArea === "none" ? null : focusArea,
      },
      workoutTemplates,
    );

    if (!nextResult.recommended) {
      setError(messages.noMatch);
      setResult(null);
      return;
    }

    setError(null);
    setResult(nextResult);
  };

  return (
    <>
      <ToolFormCard
        eyebrow={messages.eyebrow}
        title={messages.title}
        description={messages.description}
      >
        <form className="tool-form" onSubmit={handleSubmit}>
          <div className="tool-form-grid">
            <Field label={messages.goal}>
              <SelectInput value={goal} onChange={(event) => setGoal(event.target.value as WorkoutGeneratorGoal)}>
                {WORKOUT_GENERATOR_GOALS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {messages.options.goals[option.value]}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label={messages.experience}>
              <SelectInput
                value={experience}
                onChange={(event) => setExperience(event.target.value as WorkoutGeneratorExperience)}
              >
                {WORKOUT_GENERATOR_EXPERIENCE_LEVELS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {messages.options.experience[option.value]}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label={messages.equipment}>
              <SelectInput
                value={equipment}
                onChange={(event) => setEquipment(event.target.value as WorkoutGeneratorEquipment)}
              >
                {WORKOUT_GENERATOR_EQUIPMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {messages.options.equipment[option.value]}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label={messages.daysPerWeek}>
              <SelectInput value={daysPerWeek} onChange={(event) => setDaysPerWeek(event.target.value)}>
                {WORKOUT_GENERATOR_DAY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label={messages.duration}>
              <SelectInput
                value={workoutDuration}
                onChange={(event) => setWorkoutDuration(event.target.value as WorkoutGeneratorDuration)}
              >
                {WORKOUT_GENERATOR_DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {messages.options.durations[option.value]}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label={messages.focusArea}>
              <SelectInput
                value={focusArea}
                onChange={(event) => setFocusArea(event.target.value as WorkoutGeneratorFocus | "none")}
              >
                <option value="none">{messages.noFocus}</option>
                {WORKOUT_GENERATOR_FOCUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {messages.options.focus[option.value]}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <FormActions toolSlug="workout-generator" submitLabel={messages.findWorkout}>
            <FormError message={error} />
          </FormActions>
        </form>
      </ToolFormCard>

      {recommendedTemplate ? (
        <>
          <section className="section">
            <ResultCard title={messages.recommendedWorkout}>
              <ResultGrid>
                <ResultMetric label={messages.workout} value={localizeWorkoutName(recommendedTemplate.name, locale)} />
                <ResultMetric label={messages.difficulty} value={locale === "en" ? formatDifficultyLabel(recommendedTemplate.difficulty) : localizeDifficultyLabel(recommendedTemplate.difficulty, locale)} />
                <ResultMetric
                  label={messages.estimatedDuration}
                  value={
                    recommendedTemplate.estimatedDurationMinutes != null
                      ? `${recommendedTemplate.estimatedDurationMinutes} min`
                      : messages.flexible
                  }
                />
                <ResultMetric
                  label={messages.daysPerWeek}
                  value={
                    recommendedTemplate.trainingDaysPerWeek != null
                      ? `${recommendedTemplate.trainingDaysPerWeek} ${recommendedTemplate.trainingDaysPerWeek === 1 ? messages.day : messages.days}`
                      : messages.flexible
                  }
                />
              </ResultGrid>

              <div className="tool-subgrid">
                <div className="tool-subcard">
                  <h4>{messages.shortDescription}</h4>
                  <p>{locale === "en" ? recommendedTemplate.overview ?? buildWorkoutSummary(recommendedTemplate) : localizeWorkoutSummary(recommendedTemplate, locale)}</p>
                </div>

                <div className="tool-subcard">
                  <h4>{messages.whySelected}</h4>
                  <ul>
                    {(recommendedCandidate?.reasons.length ? recommendedCandidate.reasons : [
                      messages.strongestMatch,
                    ]).map((reason) => (
                      <li key={reason}>{localizeWorkoutRecommendationReason(reason, locale)}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="tool-subgrid">
                <div className="tool-subcard">
                  <h4>{messages.equipmentNeeded}</h4>
                  <p>
                    {recommendedTemplate.equipment.length > 0
                      ? recommendedTemplate.equipment.map((value) => locale === "en" ? formatEquipmentLabel(value) : localizeEquipmentLabel(value, locale)).join(", ")
                      : messages.minimalEquipment}
                  </p>
                </div>

                <div className="tool-subcard">
                  <h4>{messages.trainingFocus}</h4>
                  <p>{locale === "en" ? formatGoalLabel(recommendedTemplate.goal) : localizeWorkoutGoalLabel(recommendedTemplate.goal, locale)}</p>
                </div>
              </div>
            </ResultCard>

            <div className="hero-actions workout-generator-actions">
              <TrackedLink
                className="button button-primary"
                href={localizePathname(`/workouts/${recommendedTemplate.slug}`, locale)}
                eventName="workout_open"
                eventParams={{
                  workout_slug: recommendedTemplate.slug,
                  source_page: "workout_generator_primary_action",
                }}
              >
                {messages.viewFullWorkout}
              </TrackedLink>

              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  void actions.saveWorkoutTemplate(recommendedTemplate.id);
                }}
              >
                {messages.saveToLogbook}
              </button>

              <TrackedLink
                className="button button-secondary"
                href={localizePathname(browsePath, locale)}
                eventName="cta_click"
                eventParams={{
                  cta_name: "Browse similar workouts",
                  cta_context: "workout_generator_primary_action",
                  workout_slug: recommendedTemplate.slug,
                }}
              >
                {messages.browseSimilar}
              </TrackedLink>
            </div>

            {actions.feedback ? <div className="form-feedback is-success">{locale === "en" ? actions.feedback : messages.saveUnavailable}</div> : null}
          </section>

          <section className="section">
            <article className="panel training-directory-card">
              <div className="section-head">
                <div className="eyebrow">{messages.previewEyebrow}</div>
                <h2 className="section-title">{messages.previewTitle}</h2>
                <p className="section-copy">{messages.previewCopy}</p>
              </div>

              {previewRows.length > 0 ? (
                <div className="training-day-stack">
                  {previewRows.map((day) => (
                    <div key={day.label} className="training-day-block">
                      <div className="training-day-head">
                        <h3>{localizeWorkoutDayLabel(day.label, locale)}</h3>
                        <span>{day.exercises.length} {day.exercises.length === 1 ? messages.exerciseSingular : messages.exercisePlural}</span>
                      </div>

                      <div className="training-table-wrap">
                        <table className="training-table">
                          <thead>
                            <tr>
                              <th>{messages.exercise}</th>
                              <th>{messages.section}</th>
                              <th>{messages.sets}</th>
                              <th>{messages.reps}</th>
                              <th>{messages.rest}</th>
                              <th>{messages.notes}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {day.exercises.map((entry) => (
                              <tr key={entry.id}>
                                <td>
                                  {entry.exercise ? (
                                    <TrackedLink
                                      className="blog-link"
                                      href={localizePathname(`/exercises/${entry.exercise.slug}`, locale)}
                                      eventName="exercise_open"
                                      eventParams={{
                                        exercise_slug: entry.exercise.slug,
                                        source_page: `workout_generator_preview_${recommendedTemplate.slug}`,
                                      }}
                                    >
                                      {localizeExerciseName(entry.exerciseName, locale)}
                                    </TrackedLink>
                                  ) : (
                                    localizeExerciseName(entry.exerciseName, locale)
                                  )}
                                </td>
                                <td>{localizePreviewSection(entry.section, locale, messages.mainWork)}</td>
                                <td>{entry.sets ?? messages.coachChoice}</td>
                                <td>{entry.reps ?? messages.coachChoice}</td>
                                <td>{formatPreviewRest(entry.restSeconds, locale, messages.selfPaced)}</td>
                                <td>{entry.notes ? localizeExerciseText(entry.notes, locale) : messages.defaultNotes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="form-note">{messages.previewSyncing}</p>
              )}
            </article>
          </section>

          {alternativeTemplates.length > 0 ? (
            <section className="section">
              <div className="section-head">
                <div className="eyebrow">{messages.alternativesEyebrow}</div>
                <h2 className="section-title">{messages.alternativesTitle}</h2>
                <p className="section-copy">{messages.alternativesCopy}</p>
              </div>

              <div className="training-grid">
                {alternativeTemplates.map((entry) => (
                  <WorkoutTemplateCard
                    key={entry.template.id}
                    workoutTemplate={entry.template}
                    sourcePage={`workout_generator_related_${recommendedTemplate.slug}`}
                    locale={locale}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}
