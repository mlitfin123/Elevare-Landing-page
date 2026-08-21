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
  analysis_mode: QuickAnalysisMode | null;
  division: string;
  competition_status: "preparing" | "assessing";
  weeks_out: number | null;
  optional_context: string | null;
  model: string | null;
  result_json: QuickAnalysisResult | null;
  retry_count: number;
  processing_started_at: string | null;
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
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("quick_analyses")
    .insert({
      analysis_mode: context.analysisMode,
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
      analysis_status: "checkout_created",
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
    .eq("analysis_status", "checkout_created");
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
  const paidAt = new Date();
  const expiresAt = new Date(paidAt.getTime() + QUICK_ANALYSIS_RESULT_HOURS * 60 * 60 * 1_000);
  const { data, error } = await supabase
    .from("quick_analyses")
    .update({
      stripe_payment_intent_id: input.paymentIntentId,
      amount_paid: input.amountPaid,
      currency: input.currency,
      payment_status: "paid",
      analysis_status: "paid",
      paid_at: paidAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      error_code: null,
    })
    .eq("id", input.analysisId)
    .eq("stripe_checkout_session_id", input.checkoutSessionId)
    .in("analysis_status", ["checkout_created", "paid", "failed_retryable"])
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
  const token = deriveQuickAnalysisToken(row.stripe_checkout_session_id);
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
        .update({ analysis_status: "expired", result_json: null, optional_context: null })
        .eq("id", row.id);
    }
    return { ...row, analysis_status: "expired" as const, result_json: null };
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

  await supabase.from("quick_analyses").update({ last_accessed_at: new Date().toISOString() }).eq("id", row.id);
  return row;
}

export function toQuickAnalysisPublicState(row: QuickAnalysisRow): QuickAnalysisPublicState {
  const canAnalyze =
    row.payment_status === "paid" &&
    ["paid", "failed_retryable"].includes(row.analysis_status) &&
    row.retry_count < QUICK_ANALYSIS_MAX_RETRIES;
  return {
    analysisMode: row.analysis_mode ?? row.result_json?.analysis_mode ?? "competition_prep",
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
