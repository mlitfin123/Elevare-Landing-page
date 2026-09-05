import { NextResponse } from "next/server";
import { QUICK_ANALYSIS_RESULT_HOURS } from "@/lib/quick-analysis";
import { normalizeQuickAnalysisSource } from "@/lib/quick-analysis-attribution";
import { issueQuickAnalysisAccessToken } from "@/lib/quick-analysis-repository";
import {
  QUICK_ANALYSIS_ACCESS_COOKIE,
  getQuickAnalysisCheckoutNonce,
  enforceQuickAnalysisRateLimit,
  getQuickAnalysisSupabase,
  quickAnalysisErrorResponse,
} from "@/lib/quick-analysis-server";
import { fulfillVerifiedQuickAnalysisSession } from "@/lib/quick-analysis-stripe";
import { absoluteUrl } from "@/lib/site";
import {
  areLocalizedRoutesEnabled,
  localizePathname,
} from "@/lib/i18n/config";
import { parseQuickAnalysisLocale } from "@/lib/quick-analysis-locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const source = normalizeQuickAnalysisSource(requestUrl.searchParams.get("source"));
  const sourceSuffix = source ? `&source=${encodeURIComponent(source)}` : "";
  const requestedLocale = parseQuickAnalysisLocale(requestUrl.searchParams.get("locale")) ?? "en";
  const localizedPath = (pathname: string) => areLocalizedRoutesEnabled()
    ? localizePathname(pathname, requestedLocale)
    : pathname;

  try {
    const supabase = getQuickAnalysisSupabase();
    await enforceQuickAnalysisRateLimit(request, "session", supabase);
    const checkoutSessionId = requestUrl.searchParams.get("session_id");
    if (!checkoutSessionId) {
      return NextResponse.redirect(absoluteUrl(`${localizedPath("/stagelab/quick-analysis/")}?payment=invalid${sourceSuffix}`), 303);
    }

    const row = await fulfillVerifiedQuickAnalysisSession(checkoutSessionId);
    const token = await issueQuickAnalysisAccessToken(
      supabase,
      row,
      getQuickAnalysisCheckoutNonce(request),
    );
    const response = NextResponse.redirect(
      absoluteUrl(`${localizedPath("/stagelab/quick-analysis/result/")}?purchase=confirmed${sourceSuffix}`),
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
      absoluteUrl(`${localizedPath("/stagelab/quick-analysis/")}?payment=${encodeURIComponent(code.toLowerCase())}${sourceSuffix}`),
      303,
    );
  }
}
