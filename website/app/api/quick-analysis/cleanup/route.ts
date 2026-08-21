import { NextResponse } from "next/server";
import { getQuickAnalysisSupabase } from "@/lib/quick-analysis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data, error } = await getQuickAnalysisSupabase().rpc("expire_quick_analysis_results");
  if (error) {
    return NextResponse.json({ error: "Cleanup could not be completed." }, { status: 503 });
  }
  return NextResponse.json(
    { expiredResults: typeof data === "number" ? data : 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
