import { TrackedLink } from "@/components/TrackedLink";
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
};

export function WorkoutTemplateCard({ workoutTemplate, sourcePage }: WorkoutTemplateCardProps) {
  return (
    <article className="panel training-card">
      <div className="training-card-top">
        <span className="meta-pill">{formatGoalLabel(workoutTemplate.goal)}</span>
        <span className="meta-pill">{formatDifficultyLabel(workoutTemplate.difficulty)}</span>
      </div>
      <h3>{workoutTemplate.name}</h3>
      <p>{workoutTemplate.overview ?? buildWorkoutSummary(workoutTemplate)}</p>
      <div className="training-card-meta">
        <span>
          {workoutTemplate.estimatedDurationMinutes != null
            ? `${workoutTemplate.estimatedDurationMinutes} min`
            : "Flexible duration"}
        </span>
        <span>
          {workoutTemplate.equipment.length > 0
            ? workoutTemplate.equipment.slice(0, 2).map(formatEquipmentLabel).join(", ")
            : "Minimal equipment"}
        </span>
      </div>
      <TrackedLink
        className="button button-secondary"
        href={`/workouts/${workoutTemplate.slug}`}
        eventName="workout_open"
        eventParams={{
          workout_slug: workoutTemplate.slug,
          source_page: sourcePage,
        }}
      >
        View workout
      </TrackedLink>
    </article>
  );
}
