import { NextResponse } from "next/server";
import { getSynchronizedStageAnalysisState } from "@/lib/stage-analysis-service";
import {
  assertQuickAnalysisSameOrigin,
  enforceQuickAnalysisRateLimit,
  getQuickAnalysisAccessToken,
  getQuickAnalysisSupabase,
  quickAnalysisErrorResponse,
} from "@/lib/quick-analysis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertQuickAnalysisSameOrigin(request);
    await enforceQuickAnalysisRateLimit(request, "status", getQuickAnalysisSupabase());
    const { state } = await getSynchronizedStageAnalysisState(getQuickAnalysisAccessToken(request));
    return NextResponse.json({ state }, {
      headers: { "Cache-Control": "no-store", Pragma: "no-cache", "Referrer-Policy": "no-referrer" },
    });
  } catch (error) {
    return quickAnalysisErrorResponse(error);
  }
}
