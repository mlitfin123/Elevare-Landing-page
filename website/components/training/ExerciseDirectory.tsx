"use client";

import { ExerciseCard } from "@/components/training/ExerciseCard";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { localizeExerciseRecord, localizeEquipmentLabel, localizeMuscleLabel } from "@/lib/i18n/catalog-content";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/config";
import { getCatalogMessages } from "@/lib/i18n/catalog-messages";
import { EXERCISE_EQUIPMENT_CATEGORIES, EXERCISE_MUSCLE_CATEGORIES, type ExerciseRecord } from "@/lib/training-data";

type ExerciseDirectoryProps = {
  exercises: ExerciseRecord[];
  locale?: Locale;
};

export function ExerciseDirectory({ exercises, locale = "en" }: ExerciseDirectoryProps) {
  const messages = getCatalogMessages(locale).exercise.directory;
  const searchableExercises = exercises.map((exercise) => localizeExerciseRecord(exercise, locale));
  const { query, setQuery, muscleGroup, setMuscleGroup, equipment, setEquipment, filteredExercises } =
    useExerciseCatalog(searchableExercises);

  return (
    <section className="section">
      <article className="panel training-directory-card">
        <div className="section-head tool-form-head">
          <div className="eyebrow">{messages.eyebrow}</div>
          <h2 className="section-title">{messages.title}</h2>
          <p className="section-copy">{messages.copy}</p>
        </div>

        <div className="tool-form-grid training-filter-grid">
          <label className="field">
            <span className="field-label">{messages.searchLabel}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={messages.searchPlaceholder}
            />
          </label>

          <label className="field">
            <span className="field-label">{messages.muscleLabel}</span>
            <select value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)}>
              <option value="all">{messages.allMuscles}</option>
              {EXERCISE_MUSCLE_CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {localizeMuscleLabel(category.slug, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">{messages.equipmentLabel}</span>
            <select value={equipment} onChange={(event) => setEquipment(event.target.value)}>
              <option value="all">{messages.allEquipment}</option>
              {EXERCISE_EQUIPMENT_CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {localizeEquipmentLabel(category.slug, locale)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="training-results-head">
          <strong>{formatNumber(filteredExercises.length, locale)} {filteredExercises.length === 1 ? messages.resultSingular : messages.resultPlural}</strong>
          <span>{messages.resultCopy}</span>
        </div>

        {filteredExercises.length > 0 ? (
          <div className="training-grid">
            {filteredExercises.map((exercise) => (
              <ExerciseCard key={exercise.slug} exercise={exercise} sourcePage="exercise_directory" prefetch={false} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="tool-warning">{messages.empty}</div>
        )}
      </article>
    </section>
  );
}
