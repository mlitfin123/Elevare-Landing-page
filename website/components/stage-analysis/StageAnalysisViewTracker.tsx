"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import { normalizeQuickAnalysisSource } from "@/lib/quick-analysis-attribution";
import type { PaidStageAnalysisProduct } from "@/lib/stage-analysis";

export function StageAnalysisViewTracker({ product }: { product: PaidStageAnalysisProduct }) {
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    const source = normalizeQuickAnalysisSource(new URLSearchParams(window.location.search).get("source"));
    try { trackEvent(product === "posing_analysis" ? "posing_analysis_view" : "complete_stage_view", { product, source }); } catch { /* Optional analytics must not hide the purchase flow. */ }
  }, [product]);
  return null;
}
