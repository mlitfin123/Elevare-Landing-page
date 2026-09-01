"use client";

import { useEffect, useState } from "react";
import { TrackedLink } from "@/components/TrackedLink";
import type { QuickAnalysisPublicState } from "@/lib/quick-analysis";

type StatusPayload = { state?: QuickAnalysisPublicState };

function getReturnLabel(state: QuickAnalysisPublicState) {
  if (state.analysisStatus === "completed") return "View my recent analysis";
  if (state.analysisStatus === "processing") return "Check analysis status";
  return "Continue my analysis";
}

export function QuickAnalysisReturnLink() {
  const [state, setState] = useState<QuickAnalysisPublicState | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function checkForRecentAnalysis() {
      try {
        const response = await fetch("/api/quick-analysis/status/?optional=1", {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as StatusPayload;
        if (payload.state && payload.state.analysisStatus !== "expired") {
          setState(payload.state);
        }
      } catch {
        // Most visitors have no recent analysis, so access-check failures stay silent.
      }
    }

    void checkForRecentAnalysis();
    return () => controller.abort();
  }, []);

  if (!state) return null;

  return (
    <aside className="quick-analysis-return-card" aria-label="Recent Quick Analysis">
      <div>
        <strong>{state.analysisStatus === "completed" ? "Your recent result is still available." : "You have an analysis in progress."}</strong>
        <span>Open it from this browser and device during the 72-hour access period.</span>
      </div>
      <TrackedLink
        className="button button-secondary"
        href="/stagelab/quick-analysis/result/"
        eventName="quick_analysis_return_clicked"
        eventParams={{
          analysis_mode: state.analysisMode,
          analysis_status: state.analysisStatus,
        }}
      >
        {getReturnLabel(state)}
      </TrackedLink>
    </aside>
  );
}
