import { handleStageAnalysisReturn } from "@/lib/stage-analysis-return";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleStageAnalysisReturn(request, "complete_stage_analysis");
}
