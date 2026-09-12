"use client";

import { POSING_RUNTIME, posingPollDelay } from "@/lib/posing-runtime";
import { compactPosingText } from "@/lib/posing-result-presentation";
import { useEffect, useState } from "react";
import type { StageAnalysisMessages } from "@/lib/i18n/stage-analysis-messages";
import type { StageAnalysisPublicState } from "@/lib/stage-analysis";

export function CompleteStagePriorities({ messages }: { messages: StageAnalysisMessages["result"] }) {
  const [state, setState] = useState<StageAnalysisPublicState | null>(null);

  useEffect(() => {
    let active = true;
    let timeout: number | undefined;
    let attempts = 0;
    const began = Date.now();
    async function load() {
      try {
      const response = await fetch("/api/stage-analysis/status/", { method: "POST", cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json() as { state?: StageAnalysisPublicState };
      if (!active || !payload.state) return;
      setState(payload.state);
      const physiqueDone = ["completed", "failed_retryable", "expired"].includes(payload.state.physique.status);
      const posingDone = ["completed", "failed_retryable", "expired"].includes(payload.state.posing.status);
      if (physiqueDone && posingDone) return;
      } catch { /* Status/analytics outages do not affect component reports. */ }
      if (active && Date.now() - began < POSING_RUNTIME.pollingHorizonMs) timeout = window.setTimeout(() => void load(), posingPollDelay(attempts++));
    }
    void load();
    return () => { active = false; if (timeout) window.clearTimeout(timeout); };
  }, []);

  const physiquePriorities = state?.physique.result?.areas_to_improve.slice(0, 2) ?? [];
  const posingPriorities = state?.posing.result?.highest_priority_corrections.slice(0, 2).map((item) => compactPosingText(item.title, 12, 1)) ?? [];
  const priorities = [...physiquePriorities, ...posingPriorities];
  if (!priorities.length) return null;

  return (
    <section className="complete-stage-priorities panel">
      <div className="eyebrow">StageLab</div>
      <h2>{messages.topPriorities}</h2>
      <ul>{priorities.map((priority, index) => <li key={`${index}-${priority}`}>{priority}</li>)}</ul>
      <p className="fine-print">{messages.separateScores}</p>
    </section>
  );
}
