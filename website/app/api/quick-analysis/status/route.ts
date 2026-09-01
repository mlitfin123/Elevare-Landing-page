import { NextResponse } from "next/server";
import {
  getQuickAnalysisByToken,
  toQuickAnalysisPublicState,
} from "@/lib/quick-analysis-repository";
import {
  QuickAnalysisServerError,
  assertQuickAnalysisSameOrigin,
  enforceQuickAnalysisRateLimit,
  getQuickAnalysisAccessToken,
  getQuickAnalysisSupabase,
  quickAnalysisErrorResponse,
} from "@/lib/quick-analysis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const optionalAccessCheck = new URL(request.url).searchParams.get("optional") === "1";
  try {
    assertQuickAnalysisSameOrigin(request);
    const supabase = getQuickAnalysisSupabase();
    await enforceQuickAnalysisRateLimit(request, "status", supabase);
    const token = getQuickAnalysisAccessToken(request);
    const row = await getQuickAnalysisByToken(supabase, token);
    return NextResponse.json(
      { state: toQuickAnalysisPublicState(row) },
      { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
    );
  } catch (error) {
    if (
      optionalAccessCheck &&
      error instanceof QuickAnalysisServerError &&
      error.code === "MISSING_ACCESS_TOKEN"
    ) {
      return NextResponse.json(
        { state: null },
        { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
      );
    }
    return quickAnalysisErrorResponse(error);
  }
}
