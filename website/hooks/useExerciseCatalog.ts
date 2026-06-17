"use client";

import { useState } from "react";
import { filterExercisesByEquipment, filterExercisesByMuscleGroup, searchExercises, type ExerciseRecord } from "@/lib/training-data";

export function useExerciseCatalog(exercises: ExerciseRecord[]) {
  const [query, setQuery] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("all");
  const [equipment, setEquipment] = useState("all");

  const filteredExercises = filterExercisesByEquipment(
    filterExercisesByMuscleGroup(searchExercises(exercises, query), muscleGroup),
    equipment,
  );

  return {
    query,
    setQuery,
    muscleGroup,
    setMuscleGroup,
    equipment,
    setEquipment,
    filteredExercises,
  };
}
