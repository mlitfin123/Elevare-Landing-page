import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";
import { getRequiredServerEnv, QuickAnalysisServerError } from "./quick-analysis-server.ts";
import type {
  PaidStageAnalysisProduct,
  PosingAnalysisResult,
  PosingDivisionKey,
} from "./stage-analysis.ts";
import { parsePosingAnalysisResult } from "./stage-analysis-schema.ts";
import type { Locale } from "./i18n/config.ts";

const API_VERSION = "elevare_posing_api_v1" as const;

type GatewayErrorBody = {
  code?: string;
  message?: string;
  retryable?: boolean;
  error?: { code?: string; message?: string; retryable?: boolean };
};

export class StageLabGatewayError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor(code: string, message: string, status: number, retryable = false) {
    super(message);
    this.name = "StageLabGatewayError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function getGatewayUrl(functionName: "authorize-elevare-analysis-order" | "elevare-posing-analysis") {
  const baseUrl = getRequiredServerEnv("STAGELAB_POSING_BASE_URL").replace(/\/$/, "");
  return `${baseUrl}/${functionName}`;
}

function signGatewayRequest(url: string, body: string) {
  const timestamp = Math.floor(Date.now() / 1_000).toString();
  const nonce = randomUUID();
  const path = new URL(url).pathname;
  const bodyHash = createHash("sha256").update(body, "utf8").digest("hex");
  const canonical = `${timestamp}\n${nonce}\nPOST\n${path}\n${bodyHash}`;
  const signature = createHmac(
    "sha256",
    getRequiredServerEnv("STAGELAB_ELEVARE_INTEGRATION_SECRET"),
  ).update(canonical, "utf8").digest("base64url");

  return {
    "Content-Type": "application/json",
    "X-Elevare-Key-Id": getRequiredServerEnv("STAGELAB_ELEVARE_KEY_ID"),
    "X-Elevare-Timestamp": timestamp,
    "X-Elevare-Nonce": nonce,
    "X-Elevare-Signature": `v1=${signature}`,
  };
}

async function postGateway<T>(
  functionName: "authorize-elevare-analysis-order" | "elevare-posing-analysis",
  payload: object,
  timeoutMs = 25_000,
): Promise<T> {
  const url = getGatewayUrl(functionName);
  const body = JSON.stringify(payload);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: signGatewayRequest(url, body),
      body,
      cache: "no-store",
      signal: controller.signal,
    });
    const parsed = await response.json().catch(() => ({})) as GatewayErrorBody | T;
    if (!response.ok) {
      const failure = parsed as GatewayErrorBody;
      const details = failure.error ?? failure;
      throw new StageLabGatewayError(
        details.code ?? "stagelab_gateway_error",
        details.message ?? "StageLab could not complete this request.",
        response.status,
        details.retryable === true,
      );
    }
    return parsed as T;
  } catch (error) {
    if (error instanceof StageLabGatewayError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new StageLabGatewayError(
        "stagelab_gateway_timeout",
        "StageLab is taking longer than expected. Please try again.",
        504,
        true,
      );
    }
    throw new StageLabGatewayError(
      "stagelab_gateway_unavailable",
      "StageLab is temporarily unavailable. Please try again.",
      503,
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function authorizeStageAnalysisOrder(input: {
  externalOrderId: string;
  stripeEventId: string;
  stripePaymentIntentId: string;
  product: PaidStageAnalysisProduct;
  paidAt: string;
}) {
  const response = await postGateway<{
    api_version: typeof API_VERSION;
    external_order_id: string;
    product: PaidStageAnalysisProduct;
    posing_access: "available" | "not_included" | "consumed" | "expired";
    authorization_expires_at: string;
    reused: boolean;
  }>("authorize-elevare-analysis-order", {
    api_version: API_VERSION,
    operation: "authorize_order",
    external_order_id: input.externalOrderId,
    stripe_event_id: input.stripeEventId,
    stripe_payment_intent_id: input.stripePaymentIntentId,
    product: input.product,
    payment_status: "paid",
    paid_at: input.paidAt,
  });

  if (response.external_order_id !== input.externalOrderId || response.product !== input.product) {
    throw new QuickAnalysisServerError(
      "STAGELAB_AUTHORIZATION_MISMATCH",
      "StageLab returned an invalid order authorization.",
      502,
    );
  }
  return response;
}

export async function revokeStageAnalysisOrder(input: {
  externalOrderId: string;
  stripePaymentIntentId: string;
  paymentStatus: "refunded" | "disputed" | "canceled";
}) {
  return postGateway("authorize-elevare-analysis-order", {
    api_version: API_VERSION,
    operation: "revoke_order",
    external_order_id: input.externalOrderId,
    stripe_payment_intent_id: input.stripePaymentIntentId,
    payment_status: input.paymentStatus,
  });
}

export type PosingUploadManifest = {
  division: PosingDivisionKey;
  locale: Locale;
  source_type: "recorded_video" | "uploaded_video";
  video: {
    file_name: string;
    mime_type: string;
    size_bytes: number;
    duration_seconds: number;
  };
  frames: Array<{
    index: number;
    timestamp_ms: number;
    mime_type: "image/jpeg" | "image/png" | "image/webp";
    size_bytes: number;
    width: number | null;
    height: number | null;
  }>;
};

export type SafeSignedUpload = {
  kind: "video" | "frame";
  frame_index: number | null;
  method: "PUT";
  url: string;
  headers: Record<string, string>;
  max_bytes: number;
};

type GatewayUploadResponse = {
  api_version: typeof API_VERSION;
  upload_session_id: string;
  client_request_id: string;
  expires_at: string;
  uploads: Array<SafeSignedUpload & { object_id: string; token: string }>;
  reused: boolean;
};

export async function initializeStageLabPosingUpload(input: {
  externalOrderId: string;
  idempotencyKey: string;
  manifest: PosingUploadManifest;
  failedAnalysisId?: string;
}) {
  const response = await postGateway<GatewayUploadResponse>("elevare-posing-analysis", {
    api_version: API_VERSION,
    operation: input.failedAnalysisId ? "retry_analysis" : "initialize_upload",
    external_order_id: input.externalOrderId,
    idempotency_key: input.idempotencyKey,
    ...(input.failedAnalysisId ? { failed_analysis_id: input.failedAnalysisId } : {}),
    ...input.manifest,
  });

  return {
    uploadSessionId: response.upload_session_id,
    clientRequestId: response.client_request_id,
    expiresAt: response.expires_at,
    reused: response.reused,
    uploads: response.uploads.map(({ kind, frame_index, method, url, headers, max_bytes }) => ({
      kind,
      frame_index,
      method,
      url,
      headers,
      max_bytes,
    })),
  };
}

export type StageLabPosingStatusResponse = {
  api_version: typeof API_VERSION;
  analysis_id: string;
  status: "uploaded" | "validating" | "analyzing" | "complete" | "invalid" | "failed";
  result: PosingAnalysisResult | null;
  error: { code: string; message: string; retryable: boolean } | null;
  completed_at: string | null;
  reused?: boolean;
};

function validateGatewayResult(response: StageLabPosingStatusResponse) {
  return {
    ...response,
    result: response.result ? parsePosingAnalysisResult(response.result) : null,
  };
}

export async function startStageLabPosingAnalysis(input: {
  externalOrderId: string;
  uploadSessionId: string;
  idempotencyKey: string;
}) {
  const response = await postGateway<StageLabPosingStatusResponse>("elevare-posing-analysis", {
    api_version: API_VERSION,
    operation: "start_analysis",
    external_order_id: input.externalOrderId,
    upload_session_id: input.uploadSessionId,
    idempotency_key: input.idempotencyKey,
  }, 55_000);
  return validateGatewayResult(response);
}

export async function getStageLabPosingStatus(input: {
  externalOrderId: string;
  analysisId: string;
}) {
  const response = await postGateway<StageLabPosingStatusResponse>("elevare-posing-analysis", {
    api_version: API_VERSION,
    operation: "get_status",
    external_order_id: input.externalOrderId,
    analysis_id: input.analysisId,
  });
  return validateGatewayResult(response);
}
