import { TrackedLink } from "@/components/TrackedLink";
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
};

export function ExerciseCard({ exercise, sourcePage }: ExerciseCardProps) {
  return (
    <article className="panel training-card">
      <div className="training-card-top">
        <span className="meta-pill">{formatMuscleLabel(exercise.primaryMuscleGroup)}</span>
        {exercise.equipment[0] ? <span className="meta-pill">{formatEquipmentLabel(exercise.equipment[0])}</span> : null}
      </div>
      <h3>{exercise.name}</h3>
      <p>{buildExerciseSummary(exercise)}</p>
      <div className="training-card-meta">
        <span>{formatDifficultyLabel(exercise.difficulty)}</span>
        <span>{formatExerciseTypeLabel(exercise.exerciseType)}</span>
      </div>
      <TrackedLink
        className="button button-secondary"
        href={`/exercises/${exercise.slug}`}
        eventName="exercise_open"
        eventParams={{
          exercise_slug: exercise.slug,
          source_page: sourcePage,
        }}
      >
        View exercise
      </TrackedLink>
    </article>
  );
}
