import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSecondarySupabaseServerConfig } from "./supabase-projects.ts";
import { siteConfig } from "./site.ts";

const RATE_LIMIT_WINDOWS = {
  checkout: { limit: 5, seconds: 60 * 60 },
  session: { limit: 20, seconds: 60 * 60 },
  analyze: { limit: 6, seconds: 60 * 60 },
  status: { limit: 120, seconds: 60 * 60 },
  translation_feedback: { limit: 5, seconds: 60 * 60 },
} as const;

export type QuickAnalysisRateLimitAction = keyof typeof RATE_LIMIT_WINDOWS;

export class QuickAnalysisServerError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    code: string,
    message: string,
    status = 400,
  ) {
    super(message);
    this.name = "QuickAnalysisServerError";
    this.code = code;
    this.status = status;
  }
}

export function getRequiredServerEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new QuickAnalysisServerError(
      "SERVICE_NOT_CONFIGURED",
      "StageLab Quick Analysis is not available yet. Please try again later.",
      503,
    );
  }
  return value;
}

export function getQuickAnalysisSupabase(): SupabaseClient {
  const config = getSecondarySupabaseServerConfig();
  if (!config.url || !config.serviceRoleKey) {
    throw new QuickAnalysisServerError(
      "DATABASE_NOT_CONFIGURED",
      "StageLab Quick Analysis is not available yet. Please try again later.",
      503,
    );
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getTokenPepper() {
  return getRequiredServerEnv("QUICK_ANALYSIS_TOKEN_PEPPER");
}

export function generateQuickAnalysisToken() {
  return randomBytes(32).toString("base64url");
}

export function deriveQuickAnalysisToken(checkoutSessionId: string) {
  return createHmac("sha256", getTokenPepper())
    .update(`quick-analysis-access:${checkoutSessionId}`)
    .digest("base64url");
}

export function hashQuickAnalysisToken(token: string) {
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) {
    throw new QuickAnalysisServerError("INVALID_TOKEN", "This analysis link is invalid.", 401);
  }
  return createHmac("sha256", getTokenPepper()).update(token).digest("hex");
}

export const QUICK_ANALYSIS_ACCESS_COOKIE = "stagelab_quick_analysis_access";
export const QUICK_ANALYSIS_CHECKOUT_COOKIE = "stagelab_quick_analysis_checkout";

function getQuickAnalysisCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const encodedValue = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);

  if (!encodedValue) return null;
  try {
    return decodeURIComponent(encodedValue);
  } catch {
    return null;
  }
}

export function getQuickAnalysisAccessToken(request: Request) {
  const token = getQuickAnalysisCookie(request, QUICK_ANALYSIS_ACCESS_COOKIE);
  if (!token) {
    throw new QuickAnalysisServerError(
      "MISSING_ACCESS_TOKEN",
      "Open this page from your completed checkout to access the analysis.",
      401,
    );
  }

  return token;
}

export function getQuickAnalysisCheckoutNonce(request: Request) {
  const token = getQuickAnalysisCookie(request, QUICK_ANALYSIS_CHECKOUT_COOKIE);
  if (!token) {
    throw new QuickAnalysisServerError(
      "MISSING_CHECKOUT_BROWSER",
      "Open this purchase from the browser that started checkout.",
      401,
    );
  }
  return token;
}

function getRequestIdentifier(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unavailable";
}

function getRateIdentifierHash(request: Request) {
  return createHmac("sha256", getTokenPepper())
    .update(`quick-analysis-rate:${getRequestIdentifier(request)}`)
    .digest("hex");
}

export async function enforceQuickAnalysisRateLimit(
  request: Request,
  action: QuickAnalysisRateLimitAction,
  supabase = getQuickAnalysisSupabase(),
) {
  const rule = RATE_LIMIT_WINDOWS[action];
  const windowMs = rule.seconds * 1_000;
  const windowStartedAt = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
  const { data, error } = await supabase.rpc("consume_quick_analysis_rate_limit", {
    p_identifier_hash: getRateIdentifierHash(request),
    p_action: action,
    p_window_started_at: windowStartedAt,
    p_limit: rule.limit,
  });

  if (error) {
    throw new QuickAnalysisServerError(
      "RATE_LIMIT_UNAVAILABLE",
      "We could not start this request safely. Please try again shortly.",
      503,
    );
  }

  if (data !== true) {
    throw new QuickAnalysisServerError(
      "RATE_LIMITED",
      "Too many attempts were made. Please wait and try again.",
      429,
    );
  }
}

export function assertQuickAnalysisSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigins = new Set([siteConfig.url]);

  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.add("http://localhost:3000");
    allowedOrigins.add("http://127.0.0.1:3000");
  }

  if (!origin || !allowedOrigins.has(origin)) {
    throw new QuickAnalysisServerError("INVALID_ORIGIN", "This request could not be verified.", 403);
  }
}

export function getQuickAnalysisReturnOrigin(request: Request) {
  if (process.env.NODE_ENV === "production") return siteConfig.url;
  const origin = request.headers.get("origin");
  return origin === "http://127.0.0.1:3000" ? origin : "http://localhost:3000";
}

export function quickAnalysisErrorResponse(error: unknown) {
  if (error instanceof QuickAnalysisServerError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }

  return Response.json(
    { error: "We could not complete that request. Please try again.", code: "UNEXPECTED_ERROR" },
    { status: 500 },
  );
}
