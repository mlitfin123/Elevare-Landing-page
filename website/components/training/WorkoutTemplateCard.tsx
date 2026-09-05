import { TrackedLink } from "@/components/TrackedLink";
import {
  localizeWorkoutGoalLabel,
  localizeWorkoutName,
  localizeWorkoutSummary,
  getWorkoutMessages,
} from "@/lib/i18n/workout-content";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import { localizeDifficultyLabel, localizeEquipmentLabel } from "@/lib/i18n/catalog-content";
import {
  buildWorkoutSummary,
  formatDifficultyLabel,
  formatEquipmentLabel,
  formatGoalLabel,
  type WorkoutTemplateRecord,
} from "@/lib/training-data";

type WorkoutTemplateCardProps = {
  workoutTemplate: WorkoutTemplateRecord;
  sourcePage: string;
  prefetch?: boolean;
  locale?: Locale;
};

export function WorkoutTemplateCard({ workoutTemplate, sourcePage, prefetch, locale = "en" }: WorkoutTemplateCardProps) {
  const messages = getWorkoutMessages(locale);
  const name = localizeWorkoutName(workoutTemplate.name, locale);

  return (
    <article className="panel training-card">
      <div className="training-card-top">
        <span className="meta-pill">{locale === "en" ? formatGoalLabel(workoutTemplate.goal) : localizeWorkoutGoalLabel(workoutTemplate.goal, locale)}</span>
        <span className="meta-pill">{locale === "en" ? formatDifficultyLabel(workoutTemplate.difficulty) : localizeDifficultyLabel(workoutTemplate.difficulty, locale)}</span>
      </div>
      <h3>{name}</h3>
      <p>{locale === "en" ? workoutTemplate.overview ?? buildWorkoutSummary(workoutTemplate) : localizeWorkoutSummary(workoutTemplate, locale)}</p>
      <div className="training-card-meta">
        <span>
          {workoutTemplate.estimatedDurationMinutes != null
            ? `${workoutTemplate.estimatedDurationMinutes} min`
            : messages.card.flexibleDuration}
        </span>
        <span>
          {workoutTemplate.equipment.length > 0
            ? workoutTemplate.equipment.slice(0, 2).map((equipment) => locale === "en" ? formatEquipmentLabel(equipment) : localizeEquipmentLabel(equipment, locale)).join(", ")
            : messages.card.minimalEquipment}
        </span>
      </div>
      <TrackedLink
        className="button button-secondary"
        href={localizePathname(`/workouts/${workoutTemplate.slug}`, locale)}
        prefetch={prefetch}
        eventName="workout_open"
        eventParams={{
          workout_slug: workoutTemplate.slug,
          source_page: sourcePage,
        }}
      >
        {messages.card.view}
      </TrackedLink>
    </article>
  );
}
