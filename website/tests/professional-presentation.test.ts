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
