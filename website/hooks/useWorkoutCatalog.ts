"use client";

import { useState } from "react";
import {
  filterWorkoutTemplatesByDifficulty,
  filterWorkoutTemplatesByGoal,
  searchWorkoutTemplates,
  type WorkoutTemplateRecord,
} from "@/lib/training-data";

export function useWorkoutCatalog(workoutTemplates: WorkoutTemplateRecord[]) {
  const [query, setQuery] = useState("");
  const [goal, setGoal] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const filteredWorkouts = filterWorkoutTemplatesByDifficulty(
    filterWorkoutTemplatesByGoal(searchWorkoutTemplates(workoutTemplates, query), goal),
    difficulty,
  );

  return {
    query,
    setQuery,
    goal,
    setGoal,
    difficulty,
    setDifficulty,
    filteredWorkouts,
  };
}
