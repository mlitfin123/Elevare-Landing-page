import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createPosingAnalysisService } from "../lib/stage-analysis-service.ts";
import type { QuickAnalysisRow } from "../lib/quick-analysis-repository.ts";
import { StageLabGatewayError, type PosingUploadManifest, type StageLabPosingStatusResponse } from "../lib/stagelab-posing-gateway.ts";
import { parsePosingAnalysisResult } from "../lib/stage-analysis-schema.ts";
const result = () => JSON.parse(fs.readFileSync(new URL("./fixtures/posing/current.json", import.meta.url), "utf8"));
function harness() {
  let row = { id: "paid-order", analysis_product: "posing_analysis", division: "Men's Physique", generation_locale: "en", posing_generation_locale: "es-419", payment_status: "paid", expires_at: new Date(Date.now() + 86400000).toISOString(), posing_status: "uploading", posing_upload_session_id: "upload-session", posing_idempotency_key: "idempotent-attempt", posing_retry_count: 1, posing_analysis_id: null, posing_result_json: null } as QuickAnalysisRow;
  const events: string[] = []; const counts = { starts: 0, status: 0, ai: 0, initialize: 0 };
  let remote: StageLabPosingStatusResponse = { api_version: "elevare_posing_api_v1", analysis_id: "saved-prompt-0.4", status: "analyzing", result: null, error: null, completed_at: null };
  let timeout = false, statusFailure = false, parseFailure = false;
  let capturedLocale: string | undefined;
  const service = createPosingAnalysisService({
    db: (() => ({})) as NonNullable<Parameters<typeof createPosingAnalysisService>[0]>["db"],
    getRow: async () => ({ ...row }),
    requestStart: async () => { events.push("intent"); row = { ...row, posing_status: "processing", posing_processing_started_at: new Date().toISOString() }; return row; },
    associate: async (_db, _row, id) => { events.push("identity"); row = { ...row, posing_status: "processing", posing_analysis_id: id }; return row; },
    start: async () => { counts.starts++; if (!counts.ai) counts.ai++; if (timeout) throw new StageLabGatewayError("stagelab_timeout", "Gateway timeout", 504, true); return { ...remote }; },
    status: async (input) => { counts.status++; assert.equal(input.externalOrderId, row.id); if (!input.analysisId) assert.equal(input.uploadSessionId, row.posing_upload_session_id ?? undefined); if (statusFailure) throw new StageLabGatewayError("gateway_unavailable", "Unavailable", 503, true); return { ...remote }; },
    parse: (value) => { events.push("parse"); if (parseFailure) throw new Error("Simulated incompatible display"); return parsePosingAnalysisResult(value); },
    reportUnavailable: async () => { row = { ...row, posing_error_code: "RESULT_FORMAT_UNAVAILABLE" }; return { ...row, posing_error_code: "RESULT_FORMAT_UNAVAILABLE" }; },
    complete: async (_db, _row, value) => { events.push("saved"); row = { ...row, posing_status: "completed", posing_result_json: value, posing_error_code: null }; return row; },
    fail: async (_db, _row, code) => { row = { ...row, posing_status: "failed_retryable", posing_error_code: code }; return row; },
    initialize: async (input) => { counts.initialize++; capturedLocale = input.manifest.locale; return { uploadSessionId: "retry-session", clientRequestId: "retry-request", expiresAt: new Date(Date.now() + 3600000).toISOString(), reused: false, uploads: [] }; },
    saveUpload: async (_db, _row, input) => { row = { ...row, posing_status: "uploading", posing_upload_session_id: input.uploadSessionId, posing_idempotency_key: input.idempotencyKey, posing_analysis_id: null }; return row; },
  });
  return { service, events, counts, get row() { return row; }, set row(value) { row = value; }, get remote() { return remote; }, set remote(value) { remote = value; }, set timeout(value: boolean) { timeout = value; }, set statusFailure(value: boolean) { statusFailure = value; }, set parseFailure(value: boolean) { parseFailure = value; }, get locale() { return capturedLocale; } };
}
function complete(h: ReturnType<typeof harness>) { h.remote = { ...h.remote, status: "complete", result: result(), completed_at: new Date().toISOString() }; }
const manifest: PosingUploadManifest = { division: "mens_physique", locale: "en", source_type: "uploaded_video", video: { file_name: "test.mp4", mime_type: "video/mp4", size_bytes: 1000, duration_seconds: 5 }, frames: [400,1800,3200,4600].map((timestamp_ms, index) => ({ index, timestamp_ms, mime_type: "image/jpeg", size_bytes: 100, width: 720, height: 1280 })) } as const;

test("completed report identity persists before presentation parsing and cannot become a new attempt", async () => {
  const h = harness(); complete(h); h.parseFailure = true;
  const state = await h.service.start("private-token");
  assert.equal(h.row.posing_analysis_id, "saved-prompt-0.4"); assert.ok(h.events.indexOf("identity") < h.events.indexOf("parse"));
  assert.equal(state.posing.errorCode, "RESULT_FORMAT_UNAVAILABLE"); assert.equal(state.posing.canUpload, false); assert.equal(state.posing.canResume, false);
  await assert.rejects(h.service.initialize("private-token", structuredClone(manifest), true));
  h.parseFailure = false; const recovered = await h.service.synchronized("private-token");
  assert.equal(recovered.state.posing.status, "completed"); assert.equal(h.counts.ai, 1); assert.equal(h.counts.initialize, 0);
});
test("backend-valid long narrative and empty cue complete without losing paid access", async () => {
  const h = harness(); complete(h); const raw = result(); raw.overall_strengths = ["A".repeat(4000)]; raw.poses_detected[0].coaching_cue = ""; h.remote = { ...h.remote, result: raw };
  const state = await h.service.start("private-token"); assert.equal(state.posing.status, "completed"); assert.equal(state.posing.result!.overall_strengths[0]!.length, 4000); assert.equal(state.posing.result!.poses_detected[0]!.coaching_cue, null);
});
test("timeout after reservation recovers identity from the durable upload session", async () => {
  const h = harness(); h.timeout = true; const state = await h.service.start("private-token");
  assert.equal(h.events[0], "intent"); assert.equal(state.posing.status, "processing"); assert.equal(state.posing.analysisId, "saved-prompt-0.4"); assert.equal(h.counts.ai, 1);
  complete(h); const refreshed = await h.service.synchronized("private-token"); assert.equal(refreshed.state.posing.status, "completed"); assert.equal(h.counts.starts, 1);
});
test("page refresh during analysis resumes status without starting AI", async () => {
  const h = harness(); h.row = { ...h.row, posing_status: "processing" };
  await h.service.synchronized("private-token"); assert.equal(h.row.posing_analysis_id, "saved-prompt-0.4"); assert.equal(h.counts.starts, 0); assert.equal(h.counts.ai, 0);
});
test("late provider completion survives multiple request deadlines", async () => {
  const h = harness(); h.timeout = true; h.statusFailure = true;
  const pending = await h.service.start("private-token"); assert.equal(pending.posing.status, "processing"); assert.equal(h.row.posing_upload_session_id, "upload-session");
  h.statusFailure = false; complete(h); assert.equal((await h.service.synchronized("private-token")).state.posing.status, "completed"); assert.equal(h.counts.ai, 1);
});
test("duplicate polling and browser back/forward never invoke a second analysis", async () => {
  const h = harness(); await h.service.start("private-token");
  await Promise.all(Array.from({ length: 8 }, () => h.service.synchronized("private-token")));
  await h.service.start("private-token"); assert.equal(h.counts.starts, 1); assert.equal(h.counts.ai, 1);
  complete(h); await h.service.synchronized("private-token"); await h.service.start("private-token"); assert.equal(h.counts.starts, 1);
});
test("saved historical report reopens without any remote or AI request", async () => {
  const h = harness(); const old = JSON.parse(fs.readFileSync(new URL("./fixtures/posing/prior.json", import.meta.url), "utf8"));
  h.row = { ...h.row, posing_status: "completed", posing_result_json: old, posing_analysis_id: old.analysis_id };
  assert.equal((await h.service.synchronized("private-token")).state.posing.status, "completed"); assert.deepEqual(h.counts, { starts: 0, status: 0, ai: 0, initialize: 0 });
});
test("malformed historical display plus unavailable gateway retains identity and hides invalid JSON", async () => {
  const h = harness(); h.row = { ...h.row, posing_status: "completed", posing_result_json: {} as QuickAnalysisRow["posing_result_json"], posing_analysis_id: "saved-prompt-0.4" }; h.statusFailure = true;
  const state = (await h.service.synchronized("private-token")).state;
  assert.equal(state.posing.result, null); assert.equal(state.posing.errorCode, "RESULT_FORMAT_UNAVAILABLE"); assert.equal(state.posing.canUpload, false); assert.equal(state.posing.analysisId, "saved-prompt-0.4");
});
test("terminal failure permits explicit retry while preserving authoritative posing locale", async () => {
  const h = harness(); h.remote = { ...h.remote, status: "failed", error: { code: "provider_or_processing_failure", message: "Internal", retryable: true } };
  assert.equal((await h.service.start("private-token")).posing.status, "failed_retryable");
  await h.service.initialize("private-token", structuredClone(manifest), true);
  assert.equal(h.counts.initialize, 1); assert.equal(h.locale, "es-419");
});
test("late success discovered before retry blocks a new reservation", async () => {
  const h = harness(); h.row = { ...h.row, posing_status: "failed_retryable", posing_analysis_id: "saved-prompt-0.4" }; complete(h);
  await assert.rejects(h.service.initialize("private-token", structuredClone(manifest), true)); assert.equal(h.row.posing_status, "completed"); assert.equal(h.counts.initialize, 0);
});
test("initialized upload returns a recoverable continuation instead of indefinite processing", async () => {
  const h = harness(); h.row = { ...h.row, posing_status: "processing" }; h.remote = { ...h.remote, analysis_id: null, status: "awaiting_start" };
  const state = (await h.service.synchronized("private-token")).state; assert.equal(state.posing.status, "uploading"); assert.equal(state.posing.canResume, true); assert.equal(h.counts.starts, 0);
});
test("expired stale upload becomes retryable without AI", async () => {
  const h = harness(); h.remote = { ...h.remote, analysis_id: null, status: "failed", error: { code: "upload_session_expired", message: "Expired", retryable: true } };
  const state = (await h.service.synchronized("private-token")).state; assert.equal(state.posing.status, "failed_retryable"); assert.equal(h.counts.ai, 0);
});
for (const payment_status of ["unpaid", "refunded", "failed"] as const) test(`posing access rejects ${payment_status} orders before remote work`, async () => {
  const h = harness(); h.row = { ...h.row, payment_status }; await assert.rejects(h.service.start("token")); await assert.rejects(h.service.synchronized("token")); assert.equal(h.counts.starts + h.counts.status, 0);
});
test("expired purchase blocks new analysis and clears website result access", async () => {
  const h = harness(); h.row = { ...h.row, expires_at: "2020-01-01T00:00:00Z" }; await assert.rejects(h.service.start("token"));
  assert.equal((await h.service.synchronized("token")).state.posing.status, "expired"); assert.equal(h.counts.starts + h.counts.status, 0);
});

test("legacy paid status with a durable analysis identity resumes the original job", async () => {
  const h = harness(); h.row = { ...h.row, posing_status: "paid", posing_analysis_id: "saved-prompt-0.4" };
  const state = (await h.service.synchronized("token")).state;
  assert.equal(state.posing.status, "processing"); assert.equal(state.posing.canUpload, false); assert.equal(h.counts.starts, 0);
});
