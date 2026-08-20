import fs from "node:fs";
import path from "node:path";
import {
  canonicalizeTrainingSnapshot,
  EMPTY_TRAINING_SNAPSHOT,
  type TrainingDataSnapshot,
} from "../lib/training-data.ts";

const trainingDataPath = path.join(process.cwd(), ".generated", "training-data.json");

function main() {
  const snapshot = fs.existsSync(trainingDataPath)
    ? (JSON.parse(fs.readFileSync(trainingDataPath, "utf8")) as TrainingDataSnapshot)
    : EMPTY_TRAINING_SNAPSHOT;
  const canonicalSnapshot = canonicalizeTrainingSnapshot(snapshot);
  const removedCount = snapshot.workoutTemplates.length - canonicalSnapshot.workoutTemplates.length;

  fs.mkdirSync(path.dirname(trainingDataPath), { recursive: true });
  fs.writeFileSync(trainingDataPath, JSON.stringify(canonicalSnapshot, null, 2));

  console.log(
    `Canonicalized ${canonicalSnapshot.workoutTemplates.length} workout templates; removed ${removedCount} duplicate route records.`,
  );
}

main();
