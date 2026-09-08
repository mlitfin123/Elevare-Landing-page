"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import type { PaidStageAnalysisProduct } from "@/lib/stage-analysis";

export function StageAnalysisViewTracker({ product }: { product: PaidStageAnalysisProduct }) {
  useEffect(() => {
    trackEvent(product === "posing_analysis" ? "posing_analysis_view" : "complete_stage_view", { product });
  }, [product]);
  return null;
}
