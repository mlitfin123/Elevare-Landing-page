import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  QUICK_ANALYSIS_MAX_RETRIES,
  QUICK_ANALYSIS_RESULT_HOURS,
  type QuickAnalysisContext,
  type QuickAnalysisMode,
  type QuickAnalysisPublicState,
  type QuickAnalysisResult,
  type QuickAnalysisStatus,
} from "./quick-analysis.ts";
import {
  includesPhysiqueAnalysis,
  includesPosingAnalysis,
  POSING_DIVISIONS,
  type PosingDivision,
  type PosingAnalysisResult,
  type PosingStatus,
  type StageAnalysisProduct,
  type StageAnalysisPublicState,
} from "./stage-analysis.ts";
import type { Locale } from "./i18n/config.ts";
import { normalizeStoredQuickAnalysisLocale } from "./quick-analysis-locale.ts";
import {
  QuickAnalysisServerError,
  deriveQuickAnalysisToken,
  hashQuickAnalysisToken,
} from "./quick-analysis-server.ts";

export type QuickAnalysisRow = {
  id: string;
  public_token_hash: string | null;
  checkout_nonce_hash: string | null;
  checkout_nonce_expires_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_paid: number;
  currency: string;
  payment_status: "unpaid" | "paid" | "refunded" | "failed";
  analysis_status: QuickAnalysisStatus;
  analysis_product: StageAnalysisProduct | null;
  analysis_mode: QuickAnalysisMode | null;
  generation_locale: Locale | null;
  division: string;
  competition_status: "preparing" | "assessing";
  weeks_out: number | null;
  optional_context: string | null;
  model: string | null;
  result_json: QuickAnalysisResult | null;
  retry_count: number;
  processing_started_at: string | null;
  posing_status: PosingStatus | null;
  posing_analysis_id: string | null;
  posing_result_json: PosingAnalysisResult | null;
  posing_error_code: string | null;
  posing_retry_count: number | null;
  posing_upload_session_id: string | null;
  posing_idempotency_key: string | null;
  posing_upload_started_at: string | null;
  posing_processing_started_at: string | null;
  posing_completed_at: string | null;
  stagelab_authorized_at: string | null;
  stagelab_authorization_expires_at: string | null;
  stagelab_authorization_event_id: string | null;
  paid_at: string | null;
  expires_at: string | null;
};

function throwDatabaseError(message: string, error?: { message?: string } | null): never {
  if (process.env.NODE_ENV !== "test" && error?.message) {
    console.error("Quick Analysis database operation failed", { message, databaseCode: "DATABASE_OPERATION_FAILED" });
  }
  throw new QuickAnalysisServerError("DATABASE_OPERATION_FAILED", message, 503);
}

export async function createQuickAnalysisCheckoutRecord(
  supabase: SupabaseClient,
  context: QuickAnalysisContext,
  legalVersions: { termsVersion: string; privacyVersion: string },
  checkoutNonce: { hash: string; expiresAt: string },
  generationLocale: Locale = "en",
  product: StageAnalysisProduct = "physique_analysis",
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("quick_analyses")
    .insert({
      analysis_product: product,
      analysis_mode: context.analysisMode,
      generation_locale: generationLocale,
      division: context.division,
      competition_status: context.competitionStatus,
      weeks_out: context.weeksOut,
      optional_context: context.optionalContext,
      age_attested_at: now,
      ai_consent_at: now,
      terms_version: legalVersions.termsVersion,
      privacy_version: legalVersions.privacyVersion,
      checkout_nonce_hash: checkoutNonce.hash,
      checkout_nonce_expires_at: checkoutNonce.expiresAt,
      payment_status: "unpaid",
      analysis_status: product === "posing_analysis" ? "completed" : "checkout_created",
      posing_status: includesPosingAnalysis(product) ? "checkout_created" : "not_included",
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throwDatabaseError("We could not prepare checkout. Please try again.", error);
  }
  return data.id as string;
}

export async function attachCheckoutSession(
  supabase: SupabaseClient,
  analysisId: string,
  checkoutSessionId: string,
) {
  const { error } = await supabase
    .from("quick_analyses")
    .update({ stripe_checkout_session_id: checkoutSessionId })
    .eq("id", analysisId)
    .eq("payment_status", "unpaid");
  if (error) throwDatabaseError("We could not finalize checkout. Please try again.", error);
}

export async function removeUnusedCheckoutRecord(supabase: SupabaseClient, analysisId: string) {
  await supabase
    .from("quick_analyses")
    .delete()
    .eq("id", analysisId)
    .eq("payment_status", "unpaid");
}

export async function activatePaidQuickAnalysis(
  supabase: SupabaseClient,
  input: {
    analysisId: string;
    checkoutSessionId: string;
    paymentIntentId: string;
    amountPaid: number;
    currency: string;
  },
) {
  const existingRow = await getQuickAnalysisByCheckoutSession(supabase, input.checkoutSessionId);
  if (!existingRow || existingRow.id !== input.analysisId) {
    throw new QuickAnalysisServerError("INVALID_CHECKOUT_SESSION", "This purchase is invalid.", 400);
  }
  const product = existingRow.analysis_product ?? "physique_analysis";
  const paidAt = new Date();
  const expiresAt = new Date(paidAt.getTime() + QUICK_ANALYSIS_RESULT_HOURS * 60 * 60 * 1_000);
  const { data, error } = await supabase
    .from("quick_analyses")
    .update({
      stripe_payment_intent_id: input.paymentIntentId,
      amount_paid: input.amountPaid,
      currency: input.currency,
      payment_status: "paid",
      analysis_status: includesPhysiqueAnalysis(product) ? "paid" : "completed",
      posing_status: includesPosingAnalysis(product)
        ? existingRow.stagelab_authorized_at ? "paid" : "awaiting_authorization"
        : "not_included",
      paid_at: paidAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      error_code: null,
    })
    .eq("id", input.analysisId)
    .eq("stripe_checkout_session_id", input.checkoutSessionId)
    .in("analysis_status", ["checkout_created", "paid", "failed_retryable", "completed"])
    .select("*")
    .maybeSingle();

  if (error || !data) {
    const existing = await getQuickAnalysisByCheckoutSession(supabase, input.checkoutSessionId);
    if (existing?.payment_status === "paid" || existing?.analysis_status === "completed") return existing;
    throwDatabaseError("We could not confirm payment. Please contact support if this continues.", error);
  }
  return data as QuickAnalysisRow;
}

export async function getQuickAnalysisByCheckoutSession(
  supabase: SupabaseClient,
  checkoutSessionId: string,
) {
  const { data, error } = await supabase
    .from("quick_analyses")
    .select("*")
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .maybeSingle();
  if (error) throwDatabaseError("We could not retrieve this purchase.", error);
  return (data as QuickAnalysisRow | null) ?? null;
}

export async function getQuickAnalysisByPaymentIntent(
  supabase: SupabaseClient,
  paymentIntentId: string,
) {
  const { data, error } = await supabase
    .from("quick_analyses")
    .select("*")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (error) throwDatabaseError("We could not retrieve this purchase.", error);
  return (data as QuickAnalysisRow | null) ?? null;
}

export async function issueQuickAnalysisAccessToken(
  supabase: SupabaseClient,
  row: QuickAnalysisRow,
  checkoutNonce: string,
) {
  if (row.payment_status !== "paid") {
    throw new QuickAnalysisServerError("PAYMENT_REQUIRED", "Payment has not been confirmed.", 402);
  }
  if (!row.stripe_checkout_session_id) {
    throw new QuickAnalysisServerError("INVALID_CHECKOUT_SESSION", "This purchase is invalid.", 400);
  }
  const checkoutSessionId = row.stripe_checkout_session_id;
  if (
    !row.checkout_nonce_hash ||
    !row.checkout_nonce_expires_at ||
    new Date(row.checkout_nonce_expires_at).getTime() <= Date.now() ||
    hashQuickAnalysisToken(checkoutNonce) !== row.checkout_nonce_hash
  ) {
    throw new QuickAnalysisServerError(
      "INVALID_CHECKOUT_BROWSER",
      "Open this purchase from the browser that started checkout.",
      401,
    );
  }

  row = await recoverStalePosingUpload(supabase, row);
  const token = deriveQuickAnalysisToken(checkoutSessionId);
  const tokenHash = hashQuickAnalysisToken(token);
  const { error } = await supabase
    .from("quick_analyses")
    .update({ public_token_hash: tokenHash, last_accessed_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("payment_status", "paid");
  if (error) throwDatabaseError("We could not open your analysis.", error);
  return token;
}

export async function getQuickAnalysisByToken(supabase: SupabaseClient, token: string) {
  const tokenHash = hashQuickAnalysisToken(token);
  const { data, error } = await supabase
    .from("quick_analyses")
    .select("*")
    .eq("public_token_hash", tokenHash)
    .maybeSingle();
  if (error) throwDatabaseError("We could not retrieve your analysis.", error);
  if (!data) throw new QuickAnalysisServerError("INVALID_TOKEN", "This analysis link is invalid.", 401);

  let row = data as QuickAnalysisRow;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    if (row.analysis_status !== "expired") {
      await supabase
        .from("quick_analyses")
        .update({
          analysis_status: "expired",
          posing_status: row.posing_status === "not_included" ? "not_included" : "expired",
          result_json: null,
          posing_result_json: null,
          posing_upload_session_id: null,
          posing_idempotency_key: null,
          optional_context: null,
        })
        .eq("id", row.id);
    }
    return {
      ...row,
      analysis_status: "expired" as const,
      posing_status: row.posing_status === "not_included" ? "not_included" as const : "expired" as const,
      result_json: null,
      posing_result_json: null,
    };
  }

  if (
    row.analysis_status === "processing" &&
    row.processing_started_at &&
    Date.now() - new Date(row.processing_started_at).getTime() > 10 * 60 * 1_000
  ) {
    const { data: recovered } = await supabase
      .from("quick_analyses")
      .update({
        analysis_status: "failed_retryable",
        processing_started_at: null,
        error_code: "STALE_PROCESSING_ATTEMPT",
      })
      .eq("id", row.id)
      .eq("analysis_status", "processing")
      .select("*")
      .maybeSingle();
    if (recovered) row = recovered as QuickAnalysisRow;
  }

  row = await recoverStalePosingUpload(supabase, row);

  await supabase.from("quick_analyses").update({ last_accessed_at: new Date().toISOString() }).eq("id", row.id);
  return row;
}

export function toQuickAnalysisPublicState(row: QuickAnalysisRow): QuickAnalysisPublicState {
  const product = row.analysis_product ?? "physique_analysis";
  const canAnalyze =
    includesPhysiqueAnalysis(product) &&
    row.payment_status === "paid" &&
    ["paid", "failed_retryable"].includes(row.analysis_status) &&
    row.retry_count < QUICK_ANALYSIS_MAX_RETRIES;
  return {
    product,
    analysisMode: row.analysis_mode ?? row.result_json?.analysis_mode ?? "competition_prep",
    generationLocale: normalizeStoredQuickAnalysisLocale(row.generation_locale),
    paymentStatus: row.payment_status,
    analysisStatus: row.analysis_status,
    canAnalyze,
    retryCount: row.retry_count,
    maxRetries: QUICK_ANALYSIS_MAX_RETRIES,
    expiresAt: row.expires_at,
    result: row.analysis_status === "completed" ? row.result_json : null,
  };
}

export async function claimQuickAnalysisAttempt(supabase: SupabaseClient, token: string) {
  const row = await getQuickAnalysisByToken(supabase, token);
  const product = row.analysis_product ?? "physique_analysis";

  if (!includesPhysiqueAnalysis(product)) {
    throw new QuickAnalysisServerError("PRODUCT_NOT_ELIGIBLE", "This purchase does not include physique analysis.", 409);
  }

  if (row.payment_status !== "paid") {
    throw new QuickAnalysisServerError("PAYMENT_REQUIRED", "Payment has not been confirmed.", 402);
  }
  if (row.analysis_status === "completed") {
    throw new QuickAnalysisServerError("ALREADY_COMPLETED", "This analysis has already been completed.", 409);
  }
  if (row.analysis_status === "expired") {
    throw new QuickAnalysisServerError("ENTITLEMENT_EXPIRED", "This analysis link has expired.", 410);
  }
  if (!["paid", "failed_retryable"].includes(row.analysis_status)) {
    throw new QuickAnalysisServerError("ANALYSIS_BUSY", "An analysis is already in progress.", 409);
  }
  if (row.retry_count >= QUICK_ANALYSIS_MAX_RETRIES) {
    throw new QuickAnalysisServerError(
      "RETRY_LIMIT_REACHED",
      "We could not deliver your analysis after several attempts. Contact support for help or a refund.",
      409,
    );
  }

  const nextRetryCount = row.retry_count + 1;
  const { data, error } = await supabase
    .from("quick_analyses")
    .update({
      analysis_status: "processing",
      retry_count: nextRetryCount,
      processing_started_at: new Date().toISOString(),
      error_code: null,
    })
    .eq("id", row.id)
    .eq("analysis_status", row.analysis_status)
    .eq("retry_count", row.retry_count)
    .select("*")
    .maybeSingle();

  if (error) throwDatabaseError("We could not start your analysis.", error);
  if (!data) throw new QuickAnalysisServerError("ANALYSIS_BUSY", "An analysis is already in progress.", 409);
  return data as QuickAnalysisRow;
}

export async function completeQuickAnalysis(
  supabase: SupabaseClient,
  row: QuickAnalysisRow,
  input: {
    result: QuickAnalysisResult;
    model: string;
    openaiRequestId: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
  },
) {
  const { error } = await supabase
    .from("quick_analyses")
    .update({
      analysis_status: "completed",
      result_json: input.result,
      model: input.model,
      openai_request_id: input.openaiRequestId,
      openai_input_tokens: input.inputTokens,
      openai_output_tokens: input.outputTokens,
      completed_at: new Date().toISOString(),
      processing_started_at: null,
      error_code: null,
    })
    .eq("id", row.id)
    .eq("analysis_status", "processing")
    .eq("retry_count", row.retry_count);
  if (error) throwDatabaseError("We could not save your completed analysis.", error);
}

export async function failQuickAnalysisAttempt(
  supabase: SupabaseClient,
  row: QuickAnalysisRow,
  errorCode: string,
) {
  await supabase
    .from("quick_analyses")
    .update({
      analysis_status: "failed_retryable",
      processing_started_at: null,
      error_code: errorCode.slice(0, 80),
    })
    .eq("id", row.id)
    .eq("analysis_status", "processing");
}

export function toStageAnalysisPublicState(row: QuickAnalysisRow): StageAnalysisPublicState {
  const product = row.analysis_product ?? "physique_analysis";
  const division = POSING_DIVISIONS.includes(row.division as PosingDivision)
    ? row.division as PosingDivision
    : "Men's Physique";
  const posingStatus = row.posing_status ?? (includesPosingAnalysis(product) ? "awaiting_authorization" : "not_included");
  const expired = row.expires_at ? new Date(row.expires_at).getTime() <= Date.now() : false;
  return {
    product,
    division,
    generationLocale: normalizeStoredQuickAnalysisLocale(row.generation_locale),
    paymentStatus: row.payment_status,
    expiresAt: row.expires_at,
    physique: {
      included: includesPhysiqueAnalysis(product),
      status: row.analysis_status,
      canAnalyze:
        includesPhysiqueAnalysis(product) &&
        row.payment_status === "paid" &&
        !expired &&
        ["paid", "failed_retryable"].includes(row.analysis_status) &&
        row.retry_count < QUICK_ANALYSIS_MAX_RETRIES,
      retryCount: row.retry_count,
      result: row.analysis_status === "completed" ? row.result_json : null,
    },
    posing: {
      included: includesPosingAnalysis(product),
      status: posingStatus,
      canUpload:
        includesPosingAnalysis(product) &&
        row.payment_status === "paid" &&
        !expired &&
        ["paid", "failed_retryable"].includes(posingStatus) &&
        (row.posing_retry_count ?? 0) < 4,
      canResume:
        includesPosingAnalysis(product) &&
        row.payment_status === "paid" &&
        !expired &&
        posingStatus === "uploading" &&
        Boolean(row.posing_upload_session_id && row.posing_idempotency_key),
      retryCount: row.posing_retry_count ?? 0,
      maxRetries: 4,
      result: posingStatus === "completed" ? row.posing_result_json : null,
      errorCode: row.posing_error_code,
    },
  };
}

async function recoverStalePosingUpload(supabase: SupabaseClient, row: QuickAnalysisRow) {
  if (
    row.posing_status !== "uploading" ||
    !row.posing_upload_started_at ||
    Date.now() - new Date(row.posing_upload_started_at).getTime() <= 2 * 60 * 60 * 1_000
  ) {
    return row;
  }

  const { data: recovered, error } = await supabase
    .from("quick_analyses")
    .update({
      posing_status: "failed_retryable",
      posing_upload_session_id: null,
      posing_idempotency_key: null,
      posing_upload_started_at: null,
      posing_error_code: "UPLOAD_SESSION_EXPIRED",
    })
    .eq("id", row.id)
    .eq("posing_status", "uploading")
    .select("*")
    .maybeSingle();
  if (error) throwDatabaseError("We could not recover the interrupted upload.", error);
  return recovered ? recovered as QuickAnalysisRow : row;
}

export async function markStageLabOrderAuthorized(
  supabase: SupabaseClient,
  input: {
    analysisId: string;
    stripeEventId: string;
    authorizationExpiresAt: string;
    posingAccess: "available" | "not_included" | "consumed" | "expired";
  },
) {
  const posingStatus = input.posingAccess === "available"
    ? "paid"
    : input.posingAccess === "consumed"
      ? "completed"
      : input.posingAccess === "expired"
        ? "expired"
        : "not_included";
  const { data, error } = await supabase
    .from("quick_analyses")
    .update({
      posing_status: posingStatus,
      stagelab_authorized_at: new Date().toISOString(),
      stagelab_authorization_expires_at: input.authorizationExpiresAt,
      stagelab_authorization_event_id: input.stripeEventId,
      posing_error_code: null,
    })
    .eq("id", input.analysisId)
    .eq("payment_status", "paid")
    .select("*")
    .maybeSingle();
  if (error || !data) throwDatabaseError("We could not activate the StageLab analysis.", error);
  return data as QuickAnalysisRow;
}

export async function markPosingUploadInitialized(
  supabase: SupabaseClient,
  row: QuickAnalysisRow,
  input: { uploadSessionId: string; idempotencyKey: string; retry: boolean },
) {
  const currentStatus = row.posing_status ?? "not_included";
  if (!["paid", "failed_retryable"].includes(currentStatus)) {
    throw new QuickAnalysisServerError("POSING_NOT_AVAILABLE", "This posing analysis is not ready for upload.", 409);
  }
  const nextRetryCount = input.retry ? (row.posing_retry_count ?? 0) + 1 : Math.max(row.posing_retry_count ?? 0, 1);
  const { data, error } = await supabase
    .from("quick_analyses")
    .update({
      posing_status: "uploading",
      posing_upload_session_id: input.uploadSessionId,
      posing_idempotency_key: input.idempotencyKey,
      posing_retry_count: nextRetryCount,
      posing_error_code: null,
      posing_processing_started_at: null,
      posing_upload_started_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("posing_status", currentStatus)
    .select("*")
    .maybeSingle();
  if (error) throwDatabaseError("We could not prepare your video upload.", error);
  if (!data) throw new QuickAnalysisServerError("POSING_BUSY", "A posing upload is already in progress.", 409);
  return data as QuickAnalysisRow;
}

export async function markPosingAnalysisStarted(
  supabase: SupabaseClient,
  row: QuickAnalysisRow,
  analysisId: string,
) {
  const { data, error } = await supabase
    .from("quick_analyses")
    .update({
      posing_status: "processing",
      posing_analysis_id: analysisId,
      posing_processing_started_at: new Date().toISOString(),
      posing_error_code: null,
      posing_upload_session_id: null,
      posing_upload_started_at: null,
    })
    .eq("id", row.id)
    .eq("posing_status", "uploading")
    .select("*")
    .maybeSingle();
  if (error || !data) throwDatabaseError("We could not start your posing analysis.", error);
  return data as QuickAnalysisRow;
}

export async function completePosingAnalysis(
  supabase: SupabaseClient,
  row: QuickAnalysisRow,
  result: PosingAnalysisResult,
  completedAt: string | null,
) {
  const { data, error } = await supabase
    .from("quick_analyses")
    .update({
      posing_status: "completed",
      posing_analysis_id: result.analysis_id,
      posing_result_json: result,
      posing_completed_at: completedAt ?? new Date().toISOString(),
      posing_processing_started_at: null,
      posing_upload_session_id: null,
      posing_idempotency_key: null,
      posing_upload_started_at: null,
      posing_error_code: null,
    })
    .eq("id", row.id)
    .eq("payment_status", "paid")
    .select("*")
    .maybeSingle();
  if (error || !data) throwDatabaseError("We could not save your posing analysis.", error);
  return data as QuickAnalysisRow;
}

export async function failPosingAnalysis(
  supabase: SupabaseClient,
  row: QuickAnalysisRow,
  errorCode: string,
) {
  const { data, error } = await supabase
    .from("quick_analyses")
    .update({
      posing_status: "failed_retryable",
      posing_error_code: errorCode.slice(0, 100),
      posing_processing_started_at: null,
      posing_upload_session_id: null,
      posing_idempotency_key: null,
      posing_upload_started_at: null,
    })
    .eq("id", row.id)
    .eq("payment_status", "paid")
    .select("*")
    .maybeSingle();
  if (error || !data) throwDatabaseError("We could not update your posing analysis.", error);
  return data as QuickAnalysisRow;
}

export async function markStageAnalysisPaymentRevoked(
  supabase: SupabaseClient,
  row: QuickAnalysisRow,
  paymentStatus: "refunded" | "failed",
) {
  const { error } = await supabase
    .from("quick_analyses")
    .update({
      payment_status: paymentStatus,
      analysis_status: "expired",
      posing_status: row.posing_status === "not_included" ? "not_included" : "expired",
      result_json: null,
      posing_result_json: null,
      optional_context: null,
      posing_upload_session_id: null,
      posing_idempotency_key: null,
      posing_upload_started_at: null,
    })
    .eq("id", row.id);
  if (error) throwDatabaseError("We could not update this payment status.", error);
}
