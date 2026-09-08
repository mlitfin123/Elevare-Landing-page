import "server-only";

import { createHash } from "node:crypto";
import {
  completePosingAnalysis,
  failPosingAnalysis,
  getQuickAnalysisByToken,
  markPosingAnalysisStarted,
  markPosingUploadInitialized,
  toStageAnalysisPublicState,
  type QuickAnalysisRow,
} from "./quick-analysis-repository.ts";
import { QuickAnalysisServerError, getQuickAnalysisSupabase } from "./quick-analysis-server.ts";
import {
  getStageLabPosingStatus,
  initializeStageLabPosingUpload,
  startStageLabPosingAnalysis,
  type PosingUploadManifest,
} from "./stagelab-posing-gateway.ts";
import { includesPosingAnalysis, POSING_DIVISION_TO_KEY } from "./stage-analysis.ts";

function assertPosingAccess(row: QuickAnalysisRow) {
  const product = row.analysis_product ?? "physique_analysis";
  if (!includesPosingAnalysis(product)) {
    throw new QuickAnalysisServerError("PRODUCT_NOT_ELIGIBLE", "This purchase does not include posing analysis.", 409);
  }
  if (row.payment_status !== "paid") {
    throw new QuickAnalysisServerError("PAYMENT_REQUIRED", "Payment has not been confirmed.", 402);
  }
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    throw new QuickAnalysisServerError("ENTITLEMENT_EXPIRED", "This analysis link has expired.", 410);
  }
}

async function applyGatewayStatus(row: QuickAnalysisRow, response: Awaited<ReturnType<typeof getStageLabPosingStatus>>) {
  const supabase = getQuickAnalysisSupabase();
  if (response.status === "complete" && response.result) {
    return completePosingAnalysis(supabase, row, response.result, response.completed_at);
  }
  if (response.status === "invalid" || response.status === "failed") {
    return failPosingAnalysis(supabase, row, response.error?.code ?? `STAGELAB_${response.status.toUpperCase()}`);
  }
  return row;
}

export async function getSynchronizedStageAnalysisState(token: string) {
  const supabase = getQuickAnalysisSupabase();
  let row = await getQuickAnalysisByToken(supabase, token);
  assertPosingAccess(row);
  if (row.posing_status === "processing" && row.posing_analysis_id) {
    const response = await getStageLabPosingStatus({
      externalOrderId: row.id,
      analysisId: row.posing_analysis_id,
    });
    row = await applyGatewayStatus(row, response);
  }
  return { row, state: toStageAnalysisPublicState(row) };
}

export async function initializePosingUploadForToken(
  token: string,
  manifest: PosingUploadManifest,
  retry: boolean,
) {
  const supabase = getQuickAnalysisSupabase();
  const row = await getQuickAnalysisByToken(supabase, token);
  assertPosingAccess(row);
  const posingStatus = row.posing_status ?? "not_included";
  if (retry && posingStatus !== "failed_retryable") {
    throw new QuickAnalysisServerError("RETRY_NOT_ALLOWED", "This posing analysis is not ready to retry.", 409);
  }
  if (!retry && posingStatus !== "paid") {
    const message = posingStatus === "awaiting_authorization"
      ? "Payment is confirmed. StageLab access is still being activated."
      : "This posing analysis is not ready for upload.";
    throw new QuickAnalysisServerError("POSING_NOT_READY", message, 409);
  }
  if ((row.posing_retry_count ?? 0) >= 4) {
    throw new QuickAnalysisServerError("RETRY_LIMIT_REACHED", "Please contact support for help with this analysis.", 409);
  }
  const expectedDivision = POSING_DIVISION_TO_KEY[row.division as keyof typeof POSING_DIVISION_TO_KEY];
  if (!expectedDivision || manifest.division !== expectedDivision) {
    throw new QuickAnalysisServerError("DIVISION_MISMATCH", "The video division does not match this purchase.", 409);
  }
  const idempotencyKey = createHash("sha256")
    .update(`${row.id}:${row.posing_retry_count ?? 0}:${JSON.stringify(manifest)}`)
    .digest("hex");
  const initialized = await initializeStageLabPosingUpload({
    externalOrderId: row.id,
    idempotencyKey,
    manifest,
    failedAnalysisId: retry ? row.posing_analysis_id ?? undefined : undefined,
  });
  await markPosingUploadInitialized(supabase, row, {
    uploadSessionId: initialized.uploadSessionId,
    idempotencyKey,
    retry,
  });
  return initialized.uploads;
}

export async function startPosingAnalysisForToken(token: string) {
  const supabase = getQuickAnalysisSupabase();
  const row = await getQuickAnalysisByToken(supabase, token);
  assertPosingAccess(row);
  if (row.posing_status !== "uploading" || !row.posing_upload_session_id || !row.posing_idempotency_key) {
    throw new QuickAnalysisServerError("UPLOAD_INCOMPLETE", "Complete the signed uploads before starting analysis.", 409);
  }
  const response = await startStageLabPosingAnalysis({
    externalOrderId: row.id,
    uploadSessionId: row.posing_upload_session_id,
    idempotencyKey: row.posing_idempotency_key,
  });
  let updated = await markPosingAnalysisStarted(supabase, row, response.analysis_id);
  if (response.status === "complete" && response.result) {
    updated = await completePosingAnalysis(supabase, updated, response.result, response.completed_at);
  } else if (response.status === "invalid" || response.status === "failed") {
    updated = await failPosingAnalysis(supabase, updated, response.error?.code ?? `STAGELAB_${response.status.toUpperCase()}`);
  }
  return toStageAnalysisPublicState(updated);
}
