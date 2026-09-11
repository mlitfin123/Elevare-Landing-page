import assert from "node:assert/strict";
import test from "node:test";
import { getStageLabMethodologyMessages, METHODOLOGY_CONCEPTS, METHODOLOGY_DETAILS } from "../lib/i18n/stagelab-methodology-messages.ts";
import type { Locale } from "../lib/i18n/config.ts";

function leaves(value: unknown, prefix = ""): Array<[string, string]> {
  if (typeof value === "string") return [[prefix, value]];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, `${prefix}.${key}`));
}

test("methodology translations cover every English text, including caveats, flow, and accordion content", () => {
  const english = leaves(getStageLabMethodologyMessages("en"));
  for (const locale of ["es-419", "pt-BR"] as const) {
    const translated = leaves(getStageLabMethodologyMessages(locale));
    assert.deepEqual(translated.map(([key]) => key), english.map(([key]) => key));
    for (const [key, value] of translated) assert.ok(value.trim(), `${locale}: ${key}`);
    // Brand/product names are intentionally shared; prose should be translated.
    const unchanged = translated.filter(([key, value]) => english.some(([enKey, enValue]) => key === enKey && value === enValue));
    assert.deepEqual(unchanged.map(([key]) => key), [".posing.eyebrow", ".posing.unaffected.3"]);
  }
});

test("unsupported locale retains English fallback and six concepts with six deeper explanations", () => {
  assert.equal(getStageLabMethodologyMessages("fr" as Locale), getStageLabMethodologyMessages("en"));
  for (const locale of ["en", "es-419", "pt-BR"] as const) {
    const copy = getStageLabMethodologyMessages(locale);
    assert.deepEqual(Object.keys(copy.cards), [...METHODOLOGY_CONCEPTS]);
    assert.deepEqual(Object.keys(copy.details), [...METHODOLOGY_DETAILS]);
    assert.equal(copy.flow.inputs.length, 6);
    assert.equal(copy.flow.steps.length, 3);
    assert.equal(copy.posing.unaffected.length, 5);
    assert.equal(copy.limits.items.length, 6);
  }
});

test("public copy preserves the material scope and uncertainty limits", () => {
  const copy = getStageLabMethodologyMessages("en");
  assert.match(copy.scope, /One-time website analyses.*do not manage a prep plan or establish a progress history/);
  assert.match(copy.cards.progress.note, /first check-in.*baseline/i);
  assert.match(copy.cards.readiness.note, /approximate.*single number of weeks/);
  assert.match(copy.cards.adjustments.body, /broader calorie and activity adjustments possible/);
  assert.match(copy.cards.division.note, /not official federation judging criteria/);
  assert.match(copy.cards.confidence.note, /not a scientifically calibrated probability/);
  assert.match(copy.details.peakWeek.paragraphs.join(" "), /does not automate dehydration, water cuts, sodium manipulation, or diuretic use/);
  assert.match(copy.posing.separation, /do not alter/);
  assert.match(copy.limits.guidance, /not scientifically validated/);
  assert.doesNotMatch(leaves(copy).map(([, value]) => value).join(" "), /only changes one variable|3500|3,500|api[_ -]?key|system prompt|json schema/i);
});
