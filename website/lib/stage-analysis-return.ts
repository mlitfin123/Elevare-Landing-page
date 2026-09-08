import "server-only";

import { NextResponse } from "next/server";
import {
  areLocalizedRoutesEnabled,
  localizePathname,
} from "./i18n/config.ts";
import { parseQuickAnalysisLocale } from "./quick-analysis-locale.ts";
import { normalizeQuickAnalysisSource } from "./quick-analysis-attribution.ts";
import { issueQuickAnalysisAccessToken } from "./quick-analysis-repository.ts";
import {
  QUICK_ANALYSIS_ACCESS_COOKIE,
  enforceQuickAnalysisRateLimit,
  getQuickAnalysisCheckoutNonce,
  getQuickAnalysisSupabase,
  quickAnalysisErrorResponse,
} from "./quick-analysis-server.ts";
import { QUICK_ANALYSIS_RESULT_HOURS } from "./quick-analysis.ts";
import { fulfillVerifiedStageAnalysisSession } from "./stage-analysis-stripe.ts";
import type { PaidStageAnalysisProduct } from "./stage-analysis.ts";
import { absoluteUrl } from "./site.ts";

export async function handleStageAnalysisReturn(request: Request, product: PaidStageAnalysisProduct) {
  const requestUrl = new URL(request.url);
  const source = normalizeQuickAnalysisSource(requestUrl.searchParams.get("source"));
  const sourceSuffix = source ? `&source=${encodeURIComponent(source)}` : "";
  const locale = parseQuickAnalysisLocale(requestUrl.searchParams.get("locale")) ?? "en";
  const route = product === "posing_analysis" ? "posing-analysis" : "complete-stage-analysis";
  const localizedPath = (pathname: string) => areLocalizedRoutesEnabled()
    ? localizePathname(pathname, locale)
    : pathname;

  try {
    const supabase = getQuickAnalysisSupabase();
    await enforceQuickAnalysisRateLimit(request, "session", supabase);
    const sessionId = requestUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.redirect(absoluteUrl(`${localizedPath(`/stagelab/${route}/`)}?payment=invalid${sourceSuffix}`), 303);
    }
    const row = await fulfillVerifiedStageAnalysisSession(sessionId, product);
    const token = await issueQuickAnalysisAccessToken(supabase, row, getQuickAnalysisCheckoutNonce(request));
    const response = NextResponse.redirect(
      absoluteUrl(`${localizedPath(`/stagelab/${route}/result/`)}?purchase=confirmed${sourceSuffix}`),
      303,
    );
    response.cookies.set({
      name: QUICK_ANALYSIS_ACCESS_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: QUICK_ANALYSIS_RESULT_HOURS * 60 * 60,
    });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    const response = quickAnalysisErrorResponse(error);
    const code = await response.json().then((body) => body.code as string).catch(() => "payment_error");
    return NextResponse.redirect(
      absoluteUrl(`${localizedPath(`/stagelab/${route}/`)}?payment=${encodeURIComponent(code.toLowerCase())}${sourceSuffix}`),
      303,
    );
  }
}
