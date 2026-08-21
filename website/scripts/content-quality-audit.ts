import fs from "node:fs";
import path from "node:path";
import {
  buildExerciseFaqs,
  buildExerciseSummary,
  buildWorkoutFaqs,
  buildWorkoutSummary,
  getExerciseSpecificBenefits,
  getExerciseSpecificMistakes,
  type ExerciseRecord,
  type TrainingDataSnapshot,
  type WorkoutTemplateRecord,
} from "../lib/training-data.ts";
import { tools } from "../lib/tools.ts";

type Classification = "NECESSARY_TEMPLATE" | "USEFUL_SHARED_EXPLANATION" | "GENERIC_FILLER";

type ContentPage = {
  id: string;
  content: string[];
};

const generatedTrainingPath = path.join(process.cwd(), ".generated", "training-data.json");
const generatedNutritionPath = path.join(process.cwd(), ".generated", "nutrition-data.json");
const reportPath = path.join(process.cwd(), "reports", "content-quality-report.json");

const genericFillerPatterns = [
  /^Builds strength and control through the .+ region\.$/,
  /^Trains multiple joints at once, which can make your sessions more efficient\.$/,
  /^Makes it easier to focus on one area when you want extra practice or volume\.$/,
  /^Gives you a repeatable way to track progress inside Logbook over time\.$/,
  /^Using more weight or speed than you can control cleanly\.$/,
  /^Changing your body position between reps instead of keeping the movement repeatable\.$/,
  /^Cutting the range of motion short and rushing through the reps\.$/,
  /^Skipping the setup and losing tension before the first rep starts\.$/,
  /^Letting momentum do the work instead of controlling the full rep\.$/,
];

const necessaryTemplatePatterns = [
  /for educational purposes only/i,
  /not medical advice/i,
  /privacy choices/i,
];

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function splitSentences(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 40);
}

function classify(text: string): Classification {
  if (genericFillerPatterns.some((pattern) => pattern.test(text))) return "GENERIC_FILLER";
  if (necessaryTemplatePatterns.some((pattern) => pattern.test(text))) return "NECESSARY_TEMPLATE";
  return "USEFUL_SHARED_EXPLANATION";
}

function buildFrequencyReport(pages: ContentPage[]) {
  const counts = new Map<string, number>();

  for (const page of pages) {
    const sentences = new Set(page.content.flatMap(splitSentences));
    for (const sentence of sentences) counts.set(sentence, (counts.get(sentence) ?? 0) + 1);
  }

  const threshold = Math.max(2, Math.ceil(pages.length * 0.1));

  return {
    pageCount: pages.length,
    threshold,
    repeated: [...counts.entries()]
      .filter(([, count]) => count >= threshold)
      .map(([text, count]) => ({
        text,
        count,
        percentage: Number(((count / pages.length) * 100).toFixed(1)),
        classification: classify(text),
      }))
      .sort((left, right) => right.count - left.count || left.text.localeCompare(right.text)),
  };
}

function buildExercisePages(exercises: ExerciseRecord[]): ContentPage[] {
  return exercises.map((exercise) => ({
    id: exercise.slug,
    content: [
      buildExerciseSummary(exercise),
      ...getExerciseSpecificBenefits(exercise),
      ...getExerciseSpecificMistakes(exercise),
      ...buildExerciseFaqs(exercise).flatMap((faq) => [faq.question, faq.answer]),
    ],
  }));
}

function buildWorkoutPages(workouts: WorkoutTemplateRecord[]): ContentPage[] {
  return workouts.map((workout) => ({
    id: workout.slug,
    content: [
      workout.overview ?? buildWorkoutSummary(workout),
      workout.whoItIsFor ?? "",
      workout.warmupGuidance ?? "",
      workout.progressionGuidance ?? "",
      ...buildWorkoutFaqs(workout).flatMap((faq) => [faq.question, faq.answer]),
    ],
  }));
}

function buildCalculatorPages(): ContentPage[] {
  return tools.map((tool) => ({
    id: tool.slug,
    content: [
      tool.intro,
      ...tool.explanation,
      ...tool.faqs.flatMap((faq) => [faq.question, faq.answer]),
    ],
  }));
}

function buildNutritionPages(items: Array<{ restaurantName?: string }>): ContentPage[] {
  const restaurants = [...new Set(items.map((item) => item.restaurantName?.trim()).filter(Boolean))] as string[];

  return restaurants.map((restaurantName) => ({
    id: restaurantName,
    content: [
      `Search, filter, and compare calories, protein, carbs, fat, and serving size across ${restaurantName} menu items.`,
      "Public items currently available in this restaurant nutrition guide.",
      "Use category filters to narrow the menu down faster.",
      "Sort by the macro view that best matches your goal.",
    ],
  }));
}

function countSuppressedSourceFiller(exercises: ExerciseRecord[]) {
  const counts = new Map<string, number>();

  for (const exercise of exercises) {
    for (const text of [...exercise.benefits, ...exercise.commonMistakes]) {
      if (!genericFillerPatterns.some((pattern) => pattern.test(text))) continue;
      counts.set(text, (counts.get(text) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([text, count]) => ({ text, count, classification: "GENERIC_FILLER" as const }))
    .sort((left, right) => right.count - left.count || left.text.localeCompare(right.text));
}

function findRepresentativeExercise(exercises: ExerciseRecord[], slugs: string[]) {
  return slugs.map((slug) => exercises.find((exercise) => exercise.slug === slug)).find(Boolean) ?? null;
}

const training = readJson<TrainingDataSnapshot>(generatedTrainingPath);
const nutrition = readJson<Array<{ restaurantName?: string }>>(generatedNutritionPath);
const representatives = [
  { label: "Dumbbell Bench Press", slugs: ["dumbbell-bench-press"] },
  { label: "Romanian Deadlift", slugs: ["romanian-deadlift"] },
  { label: "Lat Pulldown", slugs: ["lat-pulldown", "wide-grip-lat-pulldown"] },
  { label: "Lateral Raise", slugs: ["lateral-raise", "side-lateral-raise"] },
  { label: "Barbell Squat", slugs: ["barbell-squat"] },
  { label: "Cable Curl", slugs: ["cable-curl", "dumbbell-bicep-curl"] },
  { label: "Plank", slugs: ["plank"] },
].map(({ label, slugs }) => {
  const exercise = findRepresentativeExercise(training.exercises, slugs);
  return {
    label,
    matchedSlug: exercise?.slug ?? null,
    summary: exercise ? buildExerciseSummary(exercise) : null,
    retainedBenefitCount: exercise ? getExerciseSpecificBenefits(exercise).length : 0,
    retainedMistakeCount: exercise ? getExerciseSpecificMistakes(exercise).length : 0,
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  thresholdPolicy: "Exact nontrivial sentences appearing on at least 10% of pages in the same content type.",
  classifications: {
    exercises: buildFrequencyReport(buildExercisePages(training.exercises)),
    workouts: buildFrequencyReport(buildWorkoutPages(training.workoutTemplates)),
    calculators: buildFrequencyReport(buildCalculatorPages()),
    nutrition: buildFrequencyReport(buildNutritionPages(nutrition)),
  },
  suppressedExerciseSourceFiller: countSuppressedSourceFiller(training.exercises),
  representativeExerciseOutput: representatives,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Content-quality report written to ${path.relative(process.cwd(), reportPath)}.`);
for (const [type, section] of Object.entries(report.classifications)) {
  console.log(`${type}: ${section.pageCount} pages, ${section.repeated.length} repeated sentences at threshold ${section.threshold}`);
}
console.log(`Suppressed generated exercise filler patterns: ${report.suppressedExerciseSourceFiller.length}`);
