"use client";

import { useEffect, useState } from "react";
import { TrackedLink } from "@/components/TrackedLink";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import type { QuickAnalysisMessages } from "@/lib/i18n/quick-analysis-types";
import type { QuickAnalysisPublicState } from "@/lib/quick-analysis";
import {
  clearQuickAnalysisRecoveryCandidate,
  hasExplicitQuickAnalysisRecoveryContext,
  hasRecentQuickAnalysisRecoveryCandidate,
} from "@/lib/quick-analysis-recovery-marker";

type StatusPayload = { state?: QuickAnalysisPublicState | null };

function getReturnLabel(state: QuickAnalysisPublicState, messages: QuickAnalysisMessages["returnLink"]) {
  if (state.analysisStatus === "completed") return messages.view;
  if (state.analysisStatus === "processing") return messages.check;
  return messages.continue;
}

export function QuickAnalysisReturnLink({ locale, messages }: { locale: Locale; messages: QuickAnalysisMessages["returnLink"] }) {
  const [state, setState] = useState<QuickAnalysisPublicState | null>(null);

  useEffect(() => {
    const explicitRecovery = hasExplicitQuickAnalysisRecoveryContext(window.location.search);
    if (!explicitRecovery && !hasRecentQuickAnalysisRecoveryCandidate()) return;

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
        } else {
          clearQuickAnalysisRecoveryCandidate();
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
    <aside className="quick-analysis-return-card" aria-label={messages.ariaLabel}>
      <div>
        <strong>{state.analysisStatus === "completed" ? messages.completedTitle : messages.inProgressTitle}</strong>
        <span>{messages.body}</span>
      </div>
      <TrackedLink
        className="button button-secondary"
        href={localizePathname("/stagelab/quick-analysis/result/", locale)}
        eventName="quick_analysis_return_clicked"
        eventParams={{
          analysis_mode: state.analysisMode,
          analysis_status: state.analysisStatus,
        }}
      >
        {getReturnLabel(state, messages)}
      </TrackedLink>
    </aside>
  );
}
