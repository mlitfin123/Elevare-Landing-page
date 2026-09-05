import { TrackedLink } from "@/components/TrackedLink";
import type { Locale } from "@/lib/i18n/config";
import {
  localizeDifficultyLabel,
  localizeEquipmentLabel,
  localizeExerciseName,
  localizeExerciseTypeLabel,
  localizeMuscleLabel,
} from "@/lib/i18n/catalog-content";
import { getCatalogMessages } from "@/lib/i18n/catalog-messages";
import { localizePathname } from "@/lib/i18n/config";
import {
  buildExerciseSummary,
  formatDifficultyLabel,
  formatEquipmentLabel,
  formatExerciseTypeLabel,
  formatMuscleLabel,
  type ExerciseRecord,
} from "@/lib/training-data";

type ExerciseCardProps = {
  exercise: ExerciseRecord;
  sourcePage: string;
  prefetch?: boolean;
  locale?: Locale;
};

export function ExerciseCard({ exercise, sourcePage, prefetch, locale = "en" }: ExerciseCardProps) {
  const messages = getCatalogMessages(locale).exercise;
  const name = localizeExerciseName(exercise.name, locale);
  const summary = locale === "en"
    ? buildExerciseSummary(exercise)
    : `${name} ${messages.detail.primaryMuscleCopy.toLowerCase()} ${localizeMuscleLabel(exercise.primaryMuscleGroup, locale)}.`;

  return (
    <article className="panel training-card">
      <div className="training-card-top">
        <span className="meta-pill">{locale === "en" ? formatMuscleLabel(exercise.primaryMuscleGroup) : localizeMuscleLabel(exercise.primaryMuscleGroup, locale)}</span>
        {exercise.equipment[0] ? <span className="meta-pill">{locale === "en" ? formatEquipmentLabel(exercise.equipment[0]) : localizeEquipmentLabel(exercise.equipment[0], locale)}</span> : null}
      </div>
      <h3>{name}</h3>
      <p>{summary}</p>
      <div className="training-card-meta">
        <span>{locale === "en" ? formatDifficultyLabel(exercise.difficulty) : localizeDifficultyLabel(exercise.difficulty, locale)}</span>
        <span>{locale === "en" ? formatExerciseTypeLabel(exercise.exerciseType) : localizeExerciseTypeLabel(exercise.exerciseType, locale)}</span>
      </div>
      <TrackedLink
        className="button button-secondary"
        href={localizePathname(`/exercises/${exercise.slug}`, locale)}
        prefetch={prefetch}
        eventName="exercise_open"
        eventParams={{
          exercise_slug: exercise.slug,
          source_page: sourcePage,
        }}
      >
        {messages.card.view}
      </TrackedLink>
    </article>
  );
}
