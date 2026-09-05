"use client";

import { WorkoutTemplateCard } from "@/components/training/WorkoutTemplateCard";
import { useWorkoutCatalog } from "@/hooks/useWorkoutCatalog";
import { WORKOUT_GOALS, type WorkoutTemplateRecord } from "@/lib/training-data";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/config";
import { localizeDifficultyLabel } from "@/lib/i18n/catalog-content";
import { getWorkoutMessages, localizeWorkoutGoal } from "@/lib/i18n/workout-content";

type WorkoutDirectoryProps = {
  workoutTemplates: WorkoutTemplateRecord[];
  locale?: Locale;
};

export function WorkoutDirectory({ workoutTemplates, locale = "en" }: WorkoutDirectoryProps) {
  const messages = getWorkoutMessages(locale);
  const { query, setQuery, goal, setGoal, difficulty, setDifficulty, filteredWorkouts } =
    useWorkoutCatalog(workoutTemplates);

  const availableDifficulties = [
    ...new Set(
      workoutTemplates
        .map((template) => template.difficulty)
        .filter((difficulty): difficulty is string => Boolean(difficulty)),
    ),
  ];

  return (
    <section className="section">
      <article className="panel training-directory-card">
        <div className="section-head tool-form-head">
          <div className="eyebrow">{messages.directory.eyebrow}</div>
          <h2 className="section-title">{messages.directory.title}</h2>
          <p className="section-copy">{messages.directory.copy}</p>
        </div>

        <div className="tool-form-grid training-filter-grid">
          <label className="field">
            <span className="field-label">{messages.directory.searchLabel}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={messages.directory.searchPlaceholder}
            />
          </label>

          <label className="field">
            <span className="field-label">{messages.directory.goal}</span>
            <select value={goal} onChange={(event) => setGoal(event.target.value)}>
              <option value="all">{messages.directory.allGoals}</option>
              {WORKOUT_GOALS.map((goalOption) => (
                <option key={goalOption.slug} value={goalOption.slug}>
                  {localizeWorkoutGoal(goalOption, locale).label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">{messages.directory.difficulty}</span>
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option value="all">{messages.directory.allDifficulties}</option>
              {availableDifficulties.map((difficultyOption) => (
                <option key={difficultyOption} value={difficultyOption}>
                  {locale === "en" ? difficultyOption.charAt(0).toUpperCase() + difficultyOption.slice(1) : localizeDifficultyLabel(difficultyOption, locale)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="training-results-head">
          <strong>{formatNumber(filteredWorkouts.length, locale)} {filteredWorkouts.length === 1 ? messages.directory.resultSingular : messages.directory.resultPlural}</strong>
          <span>{messages.directory.resultCopy}</span>
        </div>

        {filteredWorkouts.length > 0 ? (
          <div className="training-grid">
            {filteredWorkouts.map((workoutTemplate) => (
              <WorkoutTemplateCard
                key={workoutTemplate.slug}
                workoutTemplate={workoutTemplate}
                sourcePage="workout_directory"
                prefetch={false}
                locale={locale}
              />
            ))}
          </div>
        ) : (
          <div className="tool-warning">{messages.directory.empty}</div>
        )}
      </article>
    </section>
  );
}
