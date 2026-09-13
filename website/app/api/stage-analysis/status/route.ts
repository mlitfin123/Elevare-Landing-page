import { posingErrorResponse } from "@/lib/posing-server-errors";
import { NextResponse } from "next/server";
import { getSynchronizedStageAnalysisState } from "@/lib/stage-analysis-service";
import {
  assertQuickAnalysisSameOrigin,
  enforceQuickAnalysisRateLimit,
  getQuickAnalysisAccessToken,
  getQuickAnalysisSupabase,
} from "@/lib/quick-analysis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Next requires a static literal; verified against POSING_RUNTIME.routeMaxSeconds.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    assertQuickAnalysisSameOrigin(request);
    await enforceQuickAnalysisRateLimit(request, "status", getQuickAnalysisSupabase());
    const { state } = await getSynchronizedStageAnalysisState(getQuickAnalysisAccessToken(request));
    return NextResponse.json({ state }, {
      headers: { "Cache-Control": "no-store", Pragma: "no-cache", "Referrer-Policy": "no-referrer" },
    });
  } catch (error) {
    return posingErrorResponse(error, request);
  }
}
