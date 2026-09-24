import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  getLogbookCtaCopy,
  logbookConversionConfig,
} from "../lib/logbook-conversion.ts";

const projectRoot = process.cwd();
const read = (...parts: string[]) => fs.readFileSync(path.join(projectRoot, ...parts), "utf8");

test("contextual Logbook copy follows the page utility", () => {
  const workout = getLogbookCtaCopy({ sourceType: "workout", locale: "en" });
  const restaurant = getLogbookCtaCopy({ sourceType: "restaurant", locale: "en" });
  const exercise = getLogbookCtaCopy({ sourceType: "exercise", locale: "en" });

  assert.equal(workout?.title, "Take this workout to the gym");
  assert.equal(workout?.action, "Track this workout in Logbook");
  assert.equal(restaurant?.title, "Tracking this meal?");
  assert.equal(restaurant?.action, "Track this in Logbook");
  assert.equal(exercise?.presentation, "compact");
  assert.equal(exercise?.action, "Track in Logbook");
});

test("calculator CTA appears only after supported calculator results", () => {
  const nutrition = getLogbookCtaCopy({
    sourceType: "calculator",
    locale: "en",
    toolSlug: "macro-calculator",
  });
  const bodyweight = getLogbookCtaCopy({
    sourceType: "calculator",
    locale: "en",
    toolSlug: "bmi-calculator",
  });
  const stageTool = getLogbookCtaCopy({
    sourceType: "calculator",
    locale: "en",
    toolSlug: "contest-prep-countdown",
  });

  assert.equal(nutrition?.title, "Want to track against this target?");
  assert.equal(bodyweight?.title, "Track your progress");
  assert.equal(stageTool, null);
});

test("contextual copy is localized and deep links remain disabled without a mobile contract", () => {
  assert.equal(
    getLogbookCtaCopy({ sourceType: "restaurant", locale: "es-419" })?.action,
    "Registrar esto en Logbook",
  );
  assert.equal(
    getLogbookCtaCopy({ sourceType: "workout", locale: "pt-BR" })?.action,
    "Registrar este treino no Logbook",
  );
  assert.equal(logbookConversionConfig.deepLinks.enabled, false);
  assert.equal(logbookConversionConfig.deepLinks.resolveHref(), null);
});

test("calculator CTAs render only with a visible result and replace the generic footer CTA", () => {
  const shell = read("components", "tools", "ToolPageShell.tsx");
  const sharedResult = read("components", "tools", "ToolCalculatorUi.tsx");
  const localResult = read("components", "tools", "ToolCalculatorRenderer.tsx");

  assert.doesNotMatch(shell, /ToolLogbookCta/);
  assert.match(sharedResult, /<CalculatorLogbookCta \/>/);
  assert.match(localResult, /<CalculatorLogbookCta \/>/);
});

test("workout handoff follows the workout prescription and analytics wait for visibility", () => {
  const workout = read("app", "workouts", "[slug]", "page.tsx");
  const cta = read("components", "logbook", "ContextualLogbookCta.tsx");

  const prescriptionIndex = workout.indexOf("training-day-stack");
  const ctaIndex = workout.indexOf("<TrainingLogbookCta", prescriptionIndex);
  assert.ok(prescriptionIndex < ctaIndex);
  assert.ok(ctaIndex < workout.indexOf("Exercise substitutions"));
  assert.match(cta, /logbook_cta_impression/);
  assert.match(cta, /intersectionRatio < 0\.5/);
  assert.match(cta, /logbook_cta_click/);
  assert.match(cta, /logbook_store_click/);
  assert.match(cta, /logbook_deeplink_attempt/);
});
