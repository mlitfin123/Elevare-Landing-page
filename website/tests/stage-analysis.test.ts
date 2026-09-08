import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getCanonicalPosingFrameTimestamps } from "../lib/posing-video-client.ts";
import { posingAnalysisResultSchema, stageAnalysisCheckoutSchema } from "../lib/stage-analysis-schema.ts";
import {
  POSING_DIVISIONS,
  POSING_VIDEO_MAX_BYTES,
  POSING_VIDEO_MAX_SECONDS,
  POSING_VIDEO_MIME_TYPES,
  POSING_VIDEO_MIN_SECONDS,
  STAGE_ANALYSIS_PRODUCT_CONFIG,
} from "../lib/stage-analysis.ts";

const projectRoot = process.cwd();
const read = (...segments: string[]) => fs.readFileSync(path.join(projectRoot, ...segments), "utf8");

test("stage analysis products preserve the required one-time prices and divisions", () => {
  assert.equal(STAGE_ANALYSIS_PRODUCT_CONFIG.physique_analysis.priceCents, 99);
  assert.equal(STAGE_ANALYSIS_PRODUCT_CONFIG.posing_analysis.priceCents, 99);
  assert.equal(STAGE_ANALYSIS_PRODUCT_CONFIG.complete_stage_analysis.priceCents, 149);
  assert.deepEqual(POSING_DIVISIONS, ["Men's Physique", "Classic Physique", "Bodybuilding", "Bikini", "Wellness", "Figure"]);
});

test("posing checkout never requests prep timing while complete stage supports it", () => {
  const common = { division: "Figure", optionalContext: null, ageConfirmed: true, aiConsentConfirmed: true } as const;
  const posing = stageAnalysisCheckoutSchema.parse({ ...common, product: "posing_analysis", competitionStatus: "assessing", weeksOut: null });
  const complete = stageAnalysisCheckoutSchema.parse({ ...common, product: "complete_stage_analysis", competitionStatus: "preparing", weeksOut: 8 });
  assert.equal(posing.weeksOut, null);
  assert.equal(complete.weeksOut, 8);
  assert.equal(stageAnalysisCheckoutSchema.safeParse({ ...common, product: "posing_analysis", competitionStatus: "preparing", weeksOut: 8 }).success, false);
});

test("video rules and canonical frame sampling match the StageLab handoff", () => {
  assert.equal(POSING_VIDEO_MIN_SECONDS, 5);
  assert.equal(POSING_VIDEO_MAX_SECONDS, 45);
  assert.equal(POSING_VIDEO_MAX_BYTES, 180 * 1024 * 1024);
  assert.deepEqual(POSING_VIDEO_MIME_TYPES, ["video/mp4", "video/quicktime", "video/x-m4v", "video/webm", "video/3gpp"]);

  const short = getCanonicalPosingFrameTimestamps(6);
  const recommended = getCanonicalPosingFrameTimestamps(20);
  const long = getCanonicalPosingFrameTimestamps(45);
  assert.equal(short.length, 4);
  assert.equal(recommended.length, 11);
  assert.equal(long.length, 16);
  assert.equal(short[0], 480);
  assert.equal(recommended[0], 1_000);
  assert.equal(long.at(-1), 44_000);
});

test("PosingAnalysisV1 preserves unavailable scores as null", () => {
  const result = posingAnalysisResultSchema.parse({
    schema_version: "posing_analysis_v1",
    analysis_id: "analysis-test",
    division: "Bikini",
    video_usability_status: "limited",
    video_usability_reason: "The rear pose is partially obscured.",
    analysis_quality: "low",
    overall_stage_lab_posing_score: null,
    score_explanation: "A reliable overall score was not available.",
    biggest_opportunity: "Keep the full body visible.",
    overall_strengths: [],
    highest_priority_corrections: [],
    poses_detected: [{
      pose_name: "Front pose",
      segment_start_ms: 1_000,
      segment_end_ms: 3_000,
      representative_frame_timestamps_ms: [1_000],
      confidence: "low",
      pose_score: null,
      component_scores: [{ label: "Presentation", score: null, note: "Not enough visible evidence." }],
      strongest_aspect: "Upper body remains visible.",
      biggest_issue: "Feet leave the frame.",
      corrections: ["Move farther from the camera."],
      coaching_cue: "Keep the full silhouette in frame.",
    }],
    transition_observations: [],
    consistency_observations: [],
    quality_flags: ["Partial framing"],
    athlete_next_focus: ["Record a stable full-body view."],
    disclaimer: "Informational visual feedback only.",
  });
  assert.equal(result.overall_stage_lab_posing_score, null);
  assert.equal(result.poses_detected[0]?.pose_score, null);
  assert.equal(result.poses_detected[0]?.component_scores[0]?.score, null);
});

test("Stripe remains server-authoritative and both new products share the verified webhook", () => {
  const checkout = read("app", "api", "stage-analysis", "checkout", "route.ts");
  const stripe = read("lib", "stage-analysis-stripe.ts");
  const webhook = read("app", "api", "quick-analysis", "webhook", "route.ts");
  assert.match(checkout, /ui_mode: "embedded_page"/);
  assert.match(checkout, /line_items: \[\{ price: priceId, quantity: 1 \}\]/);
  assert.match(checkout, /payment_method_types: \["card"\]/);
  assert.match(stripe, /price\.unit_amount !== config\.priceCents/);
  assert.match(stripe, /session\.payment_status !== "paid"/);
  assert.match(webhook, /authorizeVerifiedStageAnalysisSession\(event\.data\.object\.id, event\.id\)/);
  assert.match(webhook, /constructEvent/);
});

test("media bypasses ElevareFit persistence and interrupted uploads are recoverable", () => {
  const experience = read("components", "stage-analysis", "PosingAnalysisResultExperience.tsx");
  const repository = read("lib", "quick-analysis-repository.ts");
  const service = read("lib", "stage-analysis-service.ts");
  const migration = read("..", "supabase", "migrations", "20260907190000_stage_analysis_products.sql");
  assert.match(experience, /fetch\(capability\.url/);
  assert.match(experience, /referrerPolicy: "no-referrer"/);
  assert.match(experience, /posing_video_upload_completed/);
  assert.match(repository, /recoverStalePosingUpload/);
  assert.match(repository, /canResume:/);
  assert.match(service, /failedAnalysisId: retry \? row\.posing_analysis_id \?\? undefined/);
  assert.doesNotMatch(migration, /(?:photo|video|frame)_(?:url|path)|storage_bucket/i);
});

test("posing video may be recorded or selected without changing the secure upload path", () => {
  const experience = read("components", "stage-analysis", "PosingAnalysisResultExperience.tsx");
  assert.match(experience, /capture="environment"/);
  assert.match(experience, /messages\.recordVideo/);
  assert.match(experience, /messages\.uploadVideo/);
  assert.match(experience, /fetch\(capability\.url/);
});

test("results are private, localized, measured without sensitive output, and excluded from sitemaps", () => {
  const posingResult = read("app", "stagelab", "posing-analysis", "result", "page.tsx");
  const completeResult = read("app", "stagelab", "complete-stage-analysis", "result", "page.tsx");
  const experience = read("components", "stage-analysis", "PosingAnalysisResultExperience.tsx");
  const sitemap = read("scripts", "generate-sitemaps.ts");
  const localized = read("app", "[locale]", "[[...slug]]", "page.tsx");
  assert.match(posingResult, /index: false, follow: false/);
  assert.match(completeResult, /index: false, follow: false/);
  assert.doesNotMatch(sitemap, /staticSiteRoutes[\s\S]{0,700}posing-analysis\/result/);
  assert.match(localized, /LocalizedStageAnalysisPage/);
  assert.match(experience, /posing_analysis_completed/);
  assert.match(experience, /complete_stage_partial/);
  assert.doesNotMatch(experience, /trackEvent\([^;]*(?:score|body_fat|optionalContext|file\.name)[^;]*\)/);
});

test("complete stage preserves separate reports and does not create a combined score", () => {
  const complete = read("components", "stage-analysis", "CompleteStageAnalysisResultExperience.tsx");
  const priorities = read("components", "stage-analysis", "CompleteStagePriorities.tsx");
  assert.match(complete, /QuickAnalysisResultExperience/);
  assert.match(complete, /PosingAnalysisResultExperience/);
  assert.match(complete, /showReportCta=\{false\}/);
  assert.match(priorities, /messages\.separateScores/);
  assert.doesNotMatch(`${complete}\n${priorities}`, /combinedScore|combined_score/);
});
