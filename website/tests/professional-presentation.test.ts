import assert from "node:assert/strict";
import test from "node:test";
import { distinctProfileLabels, expandProfileGoal } from "../lib/professional-presentation.ts";

test("legacy combined goals display once alongside current goal selections", () => {
  const stored = ["muscle_gain", "healthy_habits", "muscle_gain_body_recomposition"];
  const original = [...stored];
  const labels = distinctProfileLabels(stored.flatMap(expandProfileGoal).map(value => value.replaceAll("_", " ")));
  assert.deepEqual(labels, ["muscle gain", "healthy habits", "body recomposition"]);
  assert.deepEqual(stored, original);
});

test("goal display preserves arbitrary phrases and distinct goals", () => {
  assert.deepEqual(expandProfileGoal("Strength, confidence & consistency"), ["Strength, confidence & consistency"]);
  assert.deepEqual(distinctProfileLabels(["Muscle Gain", "muscle_gain", "Strength", "Strength training"]), ["Muscle Gain", "Strength", "Strength training"]);
});

test("goals omit labels already displayed as specialties without changing selections", () => {
  const goals = ["General fitness", "Fat loss", "Healthy habits", "FAT LOSS"];
  const specialties = ["General Fitness", "Fat Loss", "Strength Training"];
  assert.deepEqual(distinctProfileLabels(goals, specialties), ["Healthy habits"]);
  assert.deepEqual(goals, ["General fitness", "Fat loss", "Healthy habits", "FAT LOSS"]);
  assert.deepEqual(specialties, ["General Fitness", "Fat Loss", "Strength Training"]);
  assert.deepEqual(distinctProfileLabels(["Pérdida de grasa", "Hábitos saludables"], ["Pérdida de grasa"]), ["Hábitos saludables"]);
});
