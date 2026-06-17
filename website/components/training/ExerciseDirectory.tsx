"use client";

import { ExerciseCard } from "@/components/training/ExerciseCard";
import { useExerciseCatalog } from "@/hooks/useExerciseCatalog";
import { EXERCISE_EQUIPMENT_CATEGORIES, EXERCISE_MUSCLE_CATEGORIES, type ExerciseRecord } from "@/lib/training-data";

type ExerciseDirectoryProps = {
  exercises: ExerciseRecord[];
};

export function ExerciseDirectory({ exercises }: ExerciseDirectoryProps) {
  const { query, setQuery, muscleGroup, setMuscleGroup, equipment, setEquipment, filteredExercises } =
    useExerciseCatalog(exercises);

  return (
    <section className="section">
      <article className="panel training-directory-card">
        <div className="section-head tool-form-head">
          <div className="eyebrow">Exercise finder</div>
          <h2 className="section-title">Search by name, muscle group, or equipment.</h2>
          <p className="section-copy">
            Browse the public exercise library by what you want to train, what equipment you have, or the exact
            movement you are looking for.
          </p>
        </div>

        <div className="tool-form-grid training-filter-grid">
          <label className="field">
            <span className="field-label">Search exercises</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search bench press, lunge, row..."
            />
          </label>

          <label className="field">
            <span className="field-label">Muscle group</span>
            <select value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value)}>
              <option value="all">All muscle groups</option>
              {EXERCISE_MUSCLE_CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Equipment</span>
            <select value={equipment} onChange={(event) => setEquipment(event.target.value)}>
              <option value="all">All equipment</option>
              {EXERCISE_EQUIPMENT_CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="training-results-head">
          <strong>{filteredExercises.length.toLocaleString()} exercises</strong>
          <span>Use the filters to narrow the library down to a more useful shortlist.</span>
        </div>

        {filteredExercises.length > 0 ? (
          <div className="training-grid">
            {filteredExercises.map((exercise) => (
              <ExerciseCard key={exercise.slug} exercise={exercise} sourcePage="exercise_directory" />
            ))}
          </div>
        ) : (
          <div className="tool-warning">
            No exercises matched that search. Try a broader muscle group, a simpler movement name, or a different
            equipment filter.
          </div>
        )}
      </article>
    </section>
  );
}
