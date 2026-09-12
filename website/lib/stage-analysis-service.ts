import "server-only";
import { createHash } from "node:crypto";
import {
  completePosingAnalysis, failPosingAnalysis, getQuickAnalysisByToken,
  markPosingAnalysisStarted, markPosingStartRequested, markPosingReportUnavailable,
  markPosingUploadInitialized, toStageAnalysisPublicState, type QuickAnalysisRow,
} from "./quick-analysis-repository.ts";
import { QuickAnalysisServerError, getQuickAnalysisSupabase } from "./quick-analysis-server.ts";
import {
  getStageLabPosingStatus, initializeStageLabPosingUpload, startStageLabPosingAnalysis,
  StageLabGatewayError, type PosingUploadManifest, type StageLabPosingStatusResponse,
} from "./stagelab-posing-gateway.ts";
import { parsePosingAnalysisResult } from "./stage-analysis-schema.ts";
import { includesPosingAnalysis, POSING_DIVISION_TO_KEY, type StageAnalysisPublicState } from "./stage-analysis.ts";

const dependencies = {
  db: getQuickAnalysisSupabase, getRow: getQuickAnalysisByToken, associate: markPosingAnalysisStarted,
  requestStart: markPosingStartRequested, reportUnavailable: markPosingReportUnavailable,
  initialize: initializeStageLabPosingUpload, saveUpload: markPosingUploadInitialized,
  start: startStageLabPosingAnalysis, status: getStageLabPosingStatus,
  complete: completePosingAnalysis, fail: failPosingAnalysis, parse: parsePosingAnalysisResult,
};
function assertPosingAccess(row: QuickAnalysisRow, allowExpired = false) {
  if (!includesPosingAnalysis(row.analysis_product ?? "physique_analysis")) throw new QuickAnalysisServerError("PRODUCT_NOT_ELIGIBLE", "Purchase does not include posing analysis.", 409);
  if (row.payment_status !== "paid") throw new QuickAnalysisServerError("PAYMENT_REQUIRED", "Payment is not confirmed.", 402);
  if (!allowExpired && row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) throw new QuickAnalysisServerError("ENTITLEMENT_EXPIRED", "Analysis access expired.", 410);
}

/** Dependencies permit real orchestration tests without payments, network or AI. */
export function createPosingAnalysisService(overrides: Partial<typeof dependencies> = {}) {
  const d = { ...dependencies, ...overrides };
  async function apply(row: QuickAnalysisRow, response: StageLabPosingStatusResponse) {
    if (response.analysis_id && (row.posing_analysis_id !== response.analysis_id || (["uploaded", "validating", "analyzing", "complete"].includes(response.status) && !["processing", "completed"].includes(row.posing_status ?? "")))) {
      row = await d.associate(d.db(), row, response.analysis_id);
      // A concurrent attempt/completion won the database compare-and-swap.
      if (row.posing_analysis_id !== response.analysis_id) return row;
    }
    if (response.status === "complete") {
      let result;
      try {
        result = d.parse(response.result);
        if (result.analysis_id !== response.analysis_id) throw new Error("Result identity mismatch");
      } catch {
        // The identity is durable already. Never mark this retryable for new AI.
        return d.reportUnavailable(d.db(), row);
      }
      return d.complete(d.db(), row, result, response.completed_at);
    }
    if (response.status === "invalid" || response.status === "failed") {
      if (row.posing_status === "completed") return row;
      return d.fail(d.db(), row, response.error?.code ?? "STAGELAB_FAILED");
    }
    return row;
  }
  function stateFor(row: QuickAnalysisRow, phase?: StageAnalysisPublicState["posing"]["phase"]) {
    const state = toStageAnalysisPublicState(row);
    state.posing.phase = phase;
    if (row.posing_error_code === "RESULT_FORMAT_UNAVAILABLE") {
      state.posing.result = null; state.posing.canUpload = false; state.posing.canResume = false;
    }
    if (phase === "awaiting_start") {
      state.posing.status = "uploading"; state.posing.canResume = true; state.posing.canUpload = false;
    }
    return state;
  }
  async function synchronized(token: string) {
    let row = await d.getRow(d.db(), token);
    assertPosingAccess(row, true);
    if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return { row, state: stateFor(row) };
    if (row.posing_status === "completed" && row.posing_result_json) {
      try {
        // Read compatibility without rewriting historical canonical JSON.
        const result = d.parse(row.posing_result_json);
        return { row, state: stateFor({ ...row, posing_result_json: result, posing_error_code: null }) };
      } catch { row = { ...row, posing_error_code: "RESULT_FORMAT_UNAVAILABLE" }; }
    }
    let phase: StageAnalysisPublicState["posing"]["phase"];
    if (row.posing_analysis_id || row.posing_upload_session_id || ["uploading", "processing", "failed_retryable", "completed"].includes(row.posing_status ?? "")) {
      try {
        const response = await d.status({
          externalOrderId: row.id,
          analysisId: row.posing_analysis_id ?? undefined,
          uploadSessionId: row.posing_upload_session_id ?? undefined,
          idempotencyKey: row.posing_idempotency_key ?? undefined,
        });
        row = await apply(row, response);
        phase = response.status === "uploaded" ? "reserved" : response.status === "validating" || response.status === "analyzing" || response.status === "awaiting_start" ? response.status : undefined;
      } catch (error) {
        if (error instanceof StageLabGatewayError && ["analysis_not_found", "upload_session_expired"].includes(error.code)) {
          if (row.posing_status === "processing" && !row.posing_analysis_id) row = await d.fail(d.db(), row, error.code);
        } else {
          row = { ...row, posing_error_code: row.posing_error_code === "RESULT_FORMAT_UNAVAILABLE" ? row.posing_error_code : error instanceof StageLabGatewayError ? error.code : "STATUS_UNAVAILABLE" };
        }
      }
    }
    return { row, state: stateFor(row, phase) };
  }
  async function initialize(token: string, manifest: PosingUploadManifest, retry: boolean) {
    let row = await d.getRow(d.db(), token);
    assertPosingAccess(row);
    // Resolve a late saved result before allowing another attempt.
    if (row.posing_status === "failed_retryable" || row.posing_analysis_id || row.posing_upload_session_id) row = (await synchronized(token)).row;
    if (retry && row.posing_status !== "failed_retryable") throw new QuickAnalysisServerError("RETRY_NOT_ALLOWED", "Retry is unavailable.", 409);
    if (!retry && row.posing_status !== "paid") throw new QuickAnalysisServerError("POSING_NOT_READY", "Upload is not ready.", 409);
    if ((row.posing_retry_count ?? 0) >= 4) throw new QuickAnalysisServerError("RETRY_LIMIT_REACHED", "Contact support for this analysis.", 409);
    if (manifest.division !== POSING_DIVISION_TO_KEY[row.division as keyof typeof POSING_DIVISION_TO_KEY]) throw new QuickAnalysisServerError("DIVISION_MISMATCH", "Division does not match purchase.", 409);
    manifest = { ...manifest, locale: row.posing_generation_locale ?? row.generation_locale ?? "en" };
    const idempotencyKey = createHash("sha256").update(`${row.id}:${row.posing_retry_count ?? 0}:${JSON.stringify(manifest)}`).digest("hex");
    const initialized = await d.initialize({ externalOrderId: row.id, idempotencyKey, manifest, failedAnalysisId: retry ? row.posing_analysis_id ?? undefined : undefined });
    await d.saveUpload(d.db(), row, { uploadSessionId: initialized.uploadSessionId, idempotencyKey, retry });
    return initialized.uploads;
  }
  async function start(token: string) {
    let row = await d.getRow(d.db(), token);
    assertPosingAccess(row);
    if (row.posing_status === "completed" || (row.posing_status === "processing" && row.posing_analysis_id)) return (await synchronized(token)).state;
    if (!["uploading", "processing"].includes(row.posing_status ?? "") || !row.posing_upload_session_id || !row.posing_idempotency_key) throw new QuickAnalysisServerError("UPLOAD_INCOMPLETE", "Complete the upload first.", 409);
    row = await d.requestStart(d.db(), row);
    if (row.posing_status !== "processing" || !row.posing_upload_session_id || !row.posing_idempotency_key || row.posing_analysis_id) return (await synchronized(token)).state;
    try {
      const response = await d.start({ externalOrderId: row.id, uploadSessionId: row.posing_upload_session_id!, idempotencyKey: row.posing_idempotency_key! });
      row = await apply(row, response);
      return stateFor(row, response.status === "uploaded" ? "reserved" : response.status === "validating" || response.status === "analyzing" ? response.status : undefined);
    } catch (error) {
      if (!(error instanceof StageLabGatewayError)) throw error;
      // Recover via read-only order/session status even if reservation response was lost.
      const recovered = await synchronized(token);
      if (!recovered.state.posing.errorCode && recovered.state.posing.status !== "completed") recovered.state.posing.errorCode = error.code;
      return recovered.state;
    }
  }
  return { synchronized, initialize, start };
}
const service = createPosingAnalysisService();
export const getSynchronizedStageAnalysisState = service.synchronized;
export const initializePosingUploadForToken = service.initialize;
export const startPosingAnalysisForToken = service.start;
