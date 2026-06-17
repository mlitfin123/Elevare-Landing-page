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
};

export function WorkoutRecommendationTool({
  exercises,
  workoutTemplates,
  workoutTemplateExercises,
}: WorkoutRecommendationToolProps) {
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
      setError("Choose a realistic number of training days before getting a recommendation.");
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
      setError("We could not find a strong template match yet. Try a more flexible equipment or time selection.");
      setResult(null);
      return;
    }

    setError(null);
    setResult(nextResult);
  };

  return (
    <>
      <ToolFormCard
        eyebrow="Workout tool"
        title="Find a workout template that matches your goal, schedule, and setup."
        description="This tool recommends from the existing public workout library. It does not generate a brand-new plan or use AI."
      >
        <form className="tool-form" onSubmit={handleSubmit}>
          <div className="tool-form-grid">
            <Field label="Goal">
              <SelectInput value={goal} onChange={(event) => setGoal(event.target.value as WorkoutGeneratorGoal)}>
                {WORKOUT_GENERATOR_GOALS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Experience">
              <SelectInput
                value={experience}
                onChange={(event) => setExperience(event.target.value as WorkoutGeneratorExperience)}
              >
                {WORKOUT_GENERATOR_EXPERIENCE_LEVELS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Equipment">
              <SelectInput
                value={equipment}
                onChange={(event) => setEquipment(event.target.value as WorkoutGeneratorEquipment)}
              >
                {WORKOUT_GENERATOR_EQUIPMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Days per week">
              <SelectInput value={daysPerWeek} onChange={(event) => setDaysPerWeek(event.target.value)}>
                {WORKOUT_GENERATOR_DAY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Workout duration">
              <SelectInput
                value={workoutDuration}
                onChange={(event) => setWorkoutDuration(event.target.value as WorkoutGeneratorDuration)}
              >
                {WORKOUT_GENERATOR_DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Focus area">
              <SelectInput
                value={focusArea}
                onChange={(event) => setFocusArea(event.target.value as WorkoutGeneratorFocus | "none")}
              >
                <option value="none">No specific focus</option>
                {WORKOUT_GENERATOR_FOCUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <FormActions toolSlug="workout-generator" submitLabel="Find workout">
            <FormError message={error} />
          </FormActions>
        </form>
      </ToolFormCard>

      {recommendedTemplate ? (
        <>
          <section className="section">
            <ResultCard title="Recommended workout">
              <ResultGrid>
                <ResultMetric label="Workout" value={recommendedTemplate.name} />
                <ResultMetric label="Difficulty" value={formatDifficultyLabel(recommendedTemplate.difficulty)} />
                <ResultMetric
                  label="Estimated duration"
                  value={
                    recommendedTemplate.estimatedDurationMinutes != null
                      ? `${recommendedTemplate.estimatedDurationMinutes} min`
                      : "Flexible"
                  }
                />
                <ResultMetric
                  label="Days per week"
                  value={
                    recommendedTemplate.trainingDaysPerWeek != null
                      ? `${recommendedTemplate.trainingDaysPerWeek} day${recommendedTemplate.trainingDaysPerWeek === 1 ? "" : "s"}`
                      : "Flexible"
                  }
                />
              </ResultGrid>

              <div className="tool-subgrid">
                <div className="tool-subcard">
                  <h4>Short description</h4>
                  <p>{recommendedTemplate.overview ?? buildWorkoutSummary(recommendedTemplate)}</p>
                </div>

                <div className="tool-subcard">
                  <h4>Why it was selected</h4>
                  <ul>
                    {(recommendedCandidate?.reasons.length ? recommendedCandidate.reasons : [
                      "It was the strongest overall match from the current public workout library.",
                    ]).map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="tool-subgrid">
                <div className="tool-subcard">
                  <h4>Equipment needed</h4>
                  <p>
                    {recommendedTemplate.equipment.length > 0
                      ? recommendedTemplate.equipment.map(formatEquipmentLabel).join(", ")
                      : "Minimal equipment"}
                  </p>
                </div>

                <div className="tool-subcard">
                  <h4>Training focus</h4>
                  <p>{formatGoalLabel(recommendedTemplate.goal)}</p>
                </div>
              </div>
            </ResultCard>

            <div className="hero-actions workout-generator-actions">
              <TrackedLink
                className="button button-primary"
                href={`/workouts/${recommendedTemplate.slug}`}
                eventName="workout_open"
                eventParams={{
                  workout_slug: recommendedTemplate.slug,
                  source_page: "workout_generator_primary_action",
                }}
              >
                View full workout
              </TrackedLink>

              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  void actions.saveWorkoutTemplate(recommendedTemplate.id);
                }}
              >
                Save to Logbook
              </button>

              <TrackedLink
                className="button button-secondary"
                href={browsePath}
                eventName="cta_click"
                eventParams={{
                  cta_name: "Browse similar workouts",
                  cta_context: "workout_generator_primary_action",
                  workout_slug: recommendedTemplate.slug,
                }}
              >
                Browse similar workouts
              </TrackedLink>
            </div>

            {actions.feedback ? <div className="form-feedback is-success">{actions.feedback}</div> : null}
          </section>

          <section className="section">
            <article className="panel training-directory-card">
              <div className="section-head">
                <div className="eyebrow">Workout preview</div>
                <h2 className="section-title">See the structure before you commit.</h2>
                <p className="section-copy">
                  Review the exercise flow, set and rep targets, and rest guidance from the recommended template.
                </p>
              </div>

              {previewRows.length > 0 ? (
                <div className="training-day-stack">
                  {previewRows.map((day) => (
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
                                        source_page: `workout_generator_preview_${recommendedTemplate.slug}`,
                                      }}
                                    >
                                      {entry.exerciseName}
                                    </TrackedLink>
                                  ) : (
                                    entry.exerciseName
                                  )}
                                </td>
                                <td>{entry.section ?? "Main work"}</td>
                                <td>{entry.sets ?? "Coach choice"}</td>
                                <td>{entry.reps ?? "Coach choice"}</td>
                                <td>{formatRestText(entry.restSeconds)}</td>
                                <td>{entry.notes ?? "Stay consistent with the setup and execution."}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="form-note">
                  The exercise list for this template is still being synced. You can still open the full workout page
                  and browse the rest of the public library.
                </p>
              )}
            </article>
          </section>

          {alternativeTemplates.length > 0 ? (
            <section className="section">
              <div className="section-head">
                <div className="eyebrow">You may also like</div>
                <h2 className="section-title">Similar templates worth comparing.</h2>
                <p className="section-copy">
                  These options were also strong matches based on your goal, difficulty, equipment, and schedule.
                </p>
              </div>

              <div className="training-grid">
                {alternativeTemplates.map((entry) => (
                  <WorkoutTemplateCard
                    key={entry.template.id}
                    workoutTemplate={entry.template}
                    sourcePage={`workout_generator_related_${recommendedTemplate.slug}`}
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
