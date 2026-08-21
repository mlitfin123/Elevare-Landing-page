"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import type { QuickAnalysisMode } from "@/lib/quick-analysis";

export function QuickAnalysisCtaViewTracker({ mode }: { mode: QuickAnalysisMode }) {
  const targetRef = useRef<HTMLSpanElement>(null);
  const hasTracked = useRef(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target || hasTracked.current) return;

    const trackView = () => {
      if (hasTracked.current) return;
      hasTracked.current = true;
      trackEvent("quick_analysis_stagelab_cta_viewed", {
        product: "StageLab",
        analysis_mode: mode,
      });
    };

    if (!("IntersectionObserver" in window)) {
      trackView();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        trackView();
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [mode]);

  return <span ref={targetRef} className="quick-analysis-view-sentinel" aria-hidden="true" />;
}
