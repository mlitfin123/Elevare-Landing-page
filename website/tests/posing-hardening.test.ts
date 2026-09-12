import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { parseCanonicalPosingResult, POSING_CONTRACT } from "../lib/posing-contract.ts";
import { posingAnalysisResultSchema, posingUploadManifestSchema } from "../lib/stage-analysis-schema.ts";
import { getPosingFrameTimestamps, POSING_RUNTIME, posingPollDelay, posingOutputTokenBudget } from "../lib/posing-runtime.ts";
import { buildPosingPresentation, cleanPosingText } from "../lib/posing-result-presentation.ts";
import { readPosingAnalyticsMarker, writePosingAnalyticsMarker } from "../lib/posing-analytics-storage.ts";
import { getPosingMessages, posingErrorMessage, posingLabel } from "../lib/i18n/posing-messages.ts";
import { resolvePosingGenerationLocale } from "../lib/posing-locale.ts";
const fixture = (name = "current") => JSON.parse(fs.readFileSync(new URL(`./fixtures/posing/${name}.json`, import.meta.url), "utf8"));

for (const name of ["current", "prior"]) test(`posing contract: ${name} canonical saved report produces a display model`, () => {
  const input = fixture(name); const before = JSON.stringify(input);
  const canonical = posingAnalysisResultSchema.parse(input);
  for (const locale of ["en", "es-419", "pt-BR"] as const) assert.ok(buildPosingPresentation(canonical, locale).summary);
  assert.equal(JSON.stringify(input), before);
  assert.equal(canonical.analysis_id, input.analysis_id);
  assert.equal(canonical.schema_version, POSING_CONTRACT.schemaVersion);
});
for (const [name, mutate] of [
  ["empty coaching cue", (r: ReturnType<typeof fixture>) => { r.poses_detected[0].coaching_cue = ""; }],
  ["missing coaching cue", (r: ReturnType<typeof fixture>) => { delete r.poses_detected[0].coaching_cue; }],
  ["long strength", (r: ReturnType<typeof fixture>) => { r.overall_strengths = ["V".repeat(4000)]; }],
  ["long correction", (r: ReturnType<typeof fixture>) => { r.highest_priority_corrections[0].try_this = "Á".repeat(4000); }],
  ["empty optional arrays", (r: ReturnType<typeof fixture>) => { r.poses_detected = []; r.highest_priority_corrections = []; r.overall_strengths = []; }],
  ["missing optional arrays", (r: ReturnType<typeof fixture>) => { delete r.quality_flags; delete r.athlete_next_focus; }],
  ["null scores", (r: ReturnType<typeof fixture>) => { r.overall_stage_lab_posing_score = null; r.poses_detected[0].pose_score = null; }],
  ["unusable footage", (r: ReturnType<typeof fixture>) => { r.video_usability_status = "unusable"; }],
  ["localized text", (r: ReturnType<typeof fixture>) => { r.score_explanation = "Relaja los hombros. Mantenha os braços relaxados."; }],
  ["older confidence label", (r: ReturnType<typeof fixture>) => { r.poses_detected[0].confidence = "HIGH"; }],
] as const) test(`posing contract accepts ${name}`, () => {
  const input = fixture(); mutate(input); const result = posingAnalysisResultSchema.parse(input);
  assert.ok(buildPosingPresentation(result, "en"));
  if (name.includes("coaching cue")) assert.equal(result.poses_detected[0]!.coaching_cue, null);
  if (name === "long strength") assert.equal(result.overall_strengths[0]!.length, 4000);
  if (name === "long correction") assert.equal(result.highest_priority_corrections[0]!.try_this.length, 4000);
  if (name === "unusable footage") { assert.equal(result.overall_stage_lab_posing_score, null); assert.ok(result.poses_detected.every((p) => p.pose_score === null)); }
});
for (const seconds of [5, 5.1, 5.5, 5.51, 5.52, 5.9, 6, 10, 45, 5.0000000001, 5.51999999999, 44.999999999]) test(`posing sampling: ${seconds}s stays ordered within media`, () => {
  const times = getPosingFrameTimestamps(seconds);
  assert.ok(times.length >= 4 && times.length <= 16);
  assert.ok(times.every((time, index) => Number.isInteger(time) && time >= 0 && time < seconds * 1000 && (!index || time > times[index - 1]!)));
  assert.ok(times[0]! <= seconds * 1000 * .1);
  assert.ok(times.at(-1)! >= seconds * 1000 * .9);
  const gaps = times.slice(1).map((t, i) => t - times[i]!);
  assert.ok(Math.max(...gaps) - Math.min(...gaps) <= 1);
  assert.equal(posingUploadManifestSchema.safeParse({ division: "mens_physique", locale: "en", source_type: "uploaded_video", video: { file_name: "fixture.mp4", mime_type: "video/mp4", size_bytes: 1000, duration_seconds: seconds }, frames: times.map((timestamp_ms, index) => ({ index, timestamp_ms, mime_type: "image/jpeg", size_bytes: 100, width: 720, height: 1280 })) }).success, true);
});

test("optional analytics storage: normal read/write and SSR", () => {
  const values = new Map<string, string>(); const storage = () => ({ getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } });
  assert.equal(readPosingAnalyticsMarker("paid", storage), false); writePosingAnalyticsMarker("paid", storage); assert.equal(readPosingAnalyticsMarker("paid", storage), true);
  assert.doesNotThrow(() => writePosingAnalyticsMarker("ssr")); assert.equal(readPosingAnalyticsMarker("ssr"), false);
});
for (const kind of ["getter", "getItem", "setItem", "SecurityError", "QuotaExceededError", "unavailable"]) test(`optional analytics storage: ${kind} never blocks paid display`, () => {
  const fail = () => { throw new DOMException("Storage denied", kind); };
  const storage = kind === "getter" || kind === "SecurityError" || kind === "QuotaExceededError" ? fail : () => kind === "unavailable" ? undefined : { getItem: kind === "getItem" ? fail : () => null, setItem: kind === "setItem" ? fail : () => {} };
  assert.doesNotThrow(() => { readPosingAnalyticsMarker("paid", storage); writePosingAnalyticsMarker("paid", storage); });
  assert.ok(buildPosingPresentation(parseCanonicalPosingResult(fixture()), "en").priority.length);
});

test("primary posing feedback is concise, deduplicated and precedes details", () => {
  const raw = fixture(); const action = raw.highest_priority_corrections[0].try_this;
  raw.highest_priority_corrections.push(raw.highest_priority_corrections[0], { title: "Fourth", visible_evidence: "Extra evidence", try_this: "Extra correction" });
  raw.consistency_observations = [action, "Repeatable stance.", "Repeatable stance."];
  const view = buildPosingPresentation(parseCanonicalPosingResult(raw), "en");
  assert.equal(view.priority.length, 3); assert.equal(view.additionalCorrections.length, 1);
  assert.deepEqual(view.consistency, ["Repeatable stance."]);
  assert.ok(view.summary.split(/\s+/).length <= 90);
  assert.ok(view.nextFocus.length <= 4);
  const source = fs.readFileSync(new URL("../components/stage-analysis/PosingAnalysisReport.tsx", import.meta.url), "utf8");
  assert.ok(source.indexOf('className="posing-priority"') < source.indexOf('className="posing-breakdown"'));
  assert.ok(source.indexOf('className="posing-priority"') < source.indexOf('m.componentDetails'));
  assert.match(source, /<details className="panel posing-video-quality">/);
  assert.doesNotMatch(source, /<details[^>]+\bopen[\s=>]/);
});
test("historical transition 83 is never a pose performance score", () => {
  const prior = parseCanonicalPosingResult(fixture("prior"));
  assert.equal(prior.poses_detected.at(-1)!.pose_score, 83);
  const pose = buildPosingPresentation(prior, "en").poses.at(-1)!;
  assert.equal(pose.transition, true); assert.equal(pose.score, null); assert.deepEqual(pose.components, []);
});
for (const text of ["During 6710–12421ms, the return includes an arm reset.", "The hands reset (6710–12421ms).", "Entre 6710-12421 ms: los brazos se reajustan.", "Durante 6710–12421ms os braços se reposicionam."]) test(`historical prose sanitizes technical timing: ${text.slice(0, 18)}`, () => {
  const cleaned = cleanPosingText(text); assert.doesNotMatch(cleaned, /\d[\d–\- ]*ms/); assert.ok(cleaned.length > 10);
});
for (const locale of ["en", "es-419", "pt-BR"] as const) test(`posing localization: labels, recovery, errors, stores and generation in ${locale}`, () => {
  const m = getPosingMessages(locale); const view = buildPosingPresentation(parseCanonicalPosingResult(fixture()), locale);
  assert.match(view.poses[0]!.name, new RegExp(m.first)); assert.match(view.poses.at(-1)!.name, new RegExp(m.final));
  assert.equal(view.poses[0]!.confidence, m.confidence.high);
  assert.equal(posingLabel("Transition", locale, "pose"), m.transition);
  assert.ok(posingLabel("shoulder positioning", locale, "component"));
  assert.equal(posingErrorMessage("decode", locale), m.decodeError);
  assert.equal(posingErrorMessage("stagelab_timeout", locale), m.slowBody);
  assert.equal(posingErrorMessage("unrecognized_backend_English_message", locale), m.genericError);
  for (const key of ["reserved", "validating", "analyzing", "pausedTitle", "ios", "android", "openApp"] as const) assert.ok(m[key]);
  assert.equal(resolvePosingGenerationLocale(locale, { ENABLE_QUICK_ANALYSIS_ES_419_GENERATION: "false", ENABLE_QUICK_ANALYSIS_PT_BR_GENERATION: "false" }), locale);
});
test("posing locale fallback and explicit disabled locale never silently consume an English purchase", () => {
  assert.equal(resolvePosingGenerationLocale("fr", {}), "en");
  assert.throws(() => resolvePosingGenerationLocale("es-419", { ENABLE_POSING_ANALYSIS_ES_419_GENERATION: "false" }), /POSING_LOCALE_UNAVAILABLE/);
  assert.throws(() => resolvePosingGenerationLocale("pt-BR", { ENABLE_POSING_ANALYSIS_PT_BR_GENERATION: "false" }), /POSING_LOCALE_UNAVAILABLE/);
});
test("posing deadlines and output budgets are bounded", () => {
  const delays = Array.from({ length: 20 }, (_, i) => posingPollDelay(i));
  assert.ok(delays.every((v, i) => v >= 4000 && v <= 30000 && (!i || v >= delays[i - 1]!)));
  assert.ok(POSING_RUNTIME.pollingHorizonMs > POSING_RUNTIME.providerTimeoutMs);
  assert.equal(posingOutputTokenBudget(), 12000); assert.equal(posingOutputTokenBudget("100"), 12000); assert.equal(posingOutputTokenBudget("99999"), 20000);
});
