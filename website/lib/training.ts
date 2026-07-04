import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import {
  deduplicateExercises,
  EMPTY_TRAINING_SNAPSHOT,
  type ExerciseRecord,
  type TrainingDataSnapshot,
  type WorkoutTemplateExerciseRecord,
  type WorkoutTemplateRecord,
} from "@/lib/training-data";

const generatedDataPath = path.join(process.cwd(), ".generated", "training-data.json");

function readTrainingDataFile(): TrainingDataSnapshot {
  if (!fs.existsSync(generatedDataPath)) {
    return EMPTY_TRAINING_SNAPSHOT;
  }

  const parsed = JSON.parse(fs.readFileSync(generatedDataPath, "utf8")) as TrainingDataSnapshot;

  return {
    generatedAt: parsed.generatedAt ?? null,
    exercises: deduplicateExercises(parsed.exercises ?? []),
    workoutTemplates: parsed.workoutTemplates ?? [],
    workoutTemplateExercises: parsed.workoutTemplateExercises ?? [],
  };
}

export const getTrainingSnapshot = cache(async () => {
  return readTrainingDataFile();
});

export const getAllExercises = cache(async (): Promise<ExerciseRecord[]> => {
  const snapshot = await getTrainingSnapshot();
  return snapshot.exercises;
});

export const getAllWorkoutTemplates = cache(async (): Promise<WorkoutTemplateRecord[]> => {
  const snapshot = await getTrainingSnapshot();
  return snapshot.workoutTemplates;
});

export const getAllWorkoutTemplateExercises = cache(async (): Promise<WorkoutTemplateExerciseRecord[]> => {
  const snapshot = await getTrainingSnapshot();
  return snapshot.workoutTemplateExercises;
});

export async function getExerciseBySlug(slug: string) {
  const exercises = await getAllExercises();
  return exercises.find((exercise) => exercise.slug === slug) ?? null;
}

export async function getWorkoutTemplateBySlug(slug: string) {
  const templates = await getAllWorkoutTemplates();
  return templates.find((template) => template.slug === slug) ?? null;
}

export async function getWorkoutTemplateExercises(workoutTemplateId: string) {
  const templateExercises = await getAllWorkoutTemplateExercises();
  return templateExercises.filter((entry) => entry.workoutTemplateId === workoutTemplateId);
}
