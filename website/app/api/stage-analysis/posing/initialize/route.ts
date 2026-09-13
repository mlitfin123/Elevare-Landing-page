import { posingErrorResponse } from "@/lib/posing-server-errors";
import { NextResponse } from "next/server";
import { posingUploadManifestSchema } from "@/lib/stage-analysis-schema";
import { initializePosingUploadForToken } from "@/lib/stage-analysis-service";
import {
  QuickAnalysisServerError,
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
    await enforceQuickAnalysisRateLimit(request, "analyze", getQuickAnalysisSupabase());
    const parsed = posingUploadManifestSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new QuickAnalysisServerError("INVALID_VIDEO", parsed.error.issues[0]?.message ?? "The video is invalid.");
    }
    const { retry, ...manifest } = parsed.data;
    const uploads = await initializePosingUploadForToken(
      getQuickAnalysisAccessToken(request),
      manifest,
      retry,
    );
    return NextResponse.json({ uploads }, {
      headers: { "Cache-Control": "no-store", Pragma: "no-cache", "Referrer-Policy": "no-referrer" },
    });
  } catch (error) {
    return posingErrorResponse(error, request);
  }
}
