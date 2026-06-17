"use client";

import { WorkoutTemplateCard } from "@/components/training/WorkoutTemplateCard";
import { useWorkoutCatalog } from "@/hooks/useWorkoutCatalog";
import { WORKOUT_GOALS, type WorkoutTemplateRecord } from "@/lib/training-data";

type WorkoutDirectoryProps = {
  workoutTemplates: WorkoutTemplateRecord[];
};

export function WorkoutDirectory({ workoutTemplates }: WorkoutDirectoryProps) {
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
          <div className="eyebrow">Workout finder</div>
          <h2 className="section-title">Search by goal, difficulty, or training style.</h2>
          <p className="section-copy">
            Browse ready-to-use workout templates for beginners, muscle building, fat loss, and strength work.
          </p>
        </div>

        <div className="tool-form-grid training-filter-grid">
          <label className="field">
            <span className="field-label">Search workouts</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search push day, full body, strength..."
            />
          </label>

          <label className="field">
            <span className="field-label">Goal</span>
            <select value={goal} onChange={(event) => setGoal(event.target.value)}>
              <option value="all">All goals</option>
              {WORKOUT_GOALS.map((goalOption) => (
                <option key={goalOption.slug} value={goalOption.slug}>
                  {goalOption.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Difficulty</span>
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option value="all">All difficulties</option>
              {availableDifficulties.map((difficultyOption) => (
                <option key={difficultyOption} value={difficultyOption}>
                  {difficultyOption.charAt(0).toUpperCase() + difficultyOption.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="training-results-head">
          <strong>{filteredWorkouts.length.toLocaleString()} workout templates</strong>
          <span>Use the directory to find a starting point that matches your current goal and schedule.</span>
        </div>

        {filteredWorkouts.length > 0 ? (
          <div className="training-grid">
            {filteredWorkouts.map((workoutTemplate) => (
              <WorkoutTemplateCard
                key={workoutTemplate.slug}
                workoutTemplate={workoutTemplate}
                sourcePage="workout_directory"
              />
            ))}
          </div>
        ) : (
          <div className="tool-warning">
            No workout templates matched that search. Try a broader goal, a simpler keyword, or a different
            difficulty filter.
          </div>
        )}
      </article>
    </section>
  );
}
