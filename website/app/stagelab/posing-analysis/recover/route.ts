import { NextResponse } from "next/server";
import { areLocalizedRoutesEnabled, localizePathname } from "@/lib/i18n/config";
import { parseQuickAnalysisLocale } from "@/lib/quick-analysis-locale";
import {
  getQuickAnalysisById,
  issueQuickAnalysisRecoveryAccessToken,
} from "@/lib/quick-analysis-repository";
import {
  QUICK_ANALYSIS_ACCESS_COOKIE,
  QuickAnalysisServerError,
  enforceQuickAnalysisRateLimit,
  getQuickAnalysisSupabase,
} from "@/lib/quick-analysis-server";
import { QUICK_ANALYSIS_RESULT_HOURS } from "@/lib/quick-analysis";
import { absoluteUrl } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function recoveryRedirect(pathname: string, responseStatus = 303) {
  const response = NextResponse.redirect(absoluteUrl(pathname), responseStatus);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const locale = parseQuickAnalysisLocale(requestUrl.searchParams.get("locale")) ?? "en";
  const localizedPath = (pathname: string) => areLocalizedRoutesEnabled()
    ? localizePathname(pathname, locale)
    : pathname;
  const fallback = localizedPath("/stagelab/posing-analysis/");

  try {
    const analysisId = requestUrl.searchParams.get("analysis_id");
    const recoveryToken = requestUrl.searchParams.get("recovery_token");
    if (!analysisId || !/^[0-9a-f-]{36}$/i.test(analysisId) || !recoveryToken) {
      throw new QuickAnalysisServerError("INVALID_RECOVERY_LINK", "This recovery link is invalid or expired.", 401);
    }

    const supabase = getQuickAnalysisSupabase();
    await enforceQuickAnalysisRateLimit(request, "session", supabase);
    const row = await getQuickAnalysisById(supabase, analysisId);
    if (!row || row.analysis_product !== "posing_analysis") {
      throw new QuickAnalysisServerError("INVALID_RECOVERY_LINK", "This recovery link is invalid or expired.", 401);
    }
    const token = await issueQuickAnalysisRecoveryAccessToken(supabase, row, recoveryToken);
    const response = recoveryRedirect(`${localizedPath("/stagelab/posing-analysis/result/")}?recovery=confirmed`);
    response.cookies.set({
      name: QUICK_ANALYSIS_ACCESS_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: QUICK_ANALYSIS_RESULT_HOURS * 60 * 60,
    });
    return response;
  } catch {
    return recoveryRedirect(`${fallback}?payment=recovery_failed`);
  }
}
