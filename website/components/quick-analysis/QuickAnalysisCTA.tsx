"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { TrackedLink } from "@/components/TrackedLink";
import { trackEvent } from "@/lib/analytics";
import {
  getQuickAnalysisEntryHref,
  type QuickAnalysisSource,
} from "@/lib/quick-analysis-attribution";
import { formatQuickAnalysisPrice } from "@/lib/quick-analysis";

type QuickAnalysisCTAProps = {
  source: QuickAnalysisSource;
  heading: string;
  description: string;
  buttonText: string;
  variant?: "compact" | "full";
  headingLevel?: 2 | 3 | 4;
  className?: string;
};

function Heading({ level, children }: { level: 2 | 3 | 4; children: ReactNode }) {
  if (level === 2) return <h2>{children}</h2>;
  if (level === 4) return <h4>{children}</h4>;
  return <h3>{children}</h3>;
}

export function QuickAnalysisCTA({
  source,
  heading,
  description,
  buttonText,
  variant = "full",
  headingLevel = 3,
  className,
}: QuickAnalysisCTAProps) {
  const targetRef = useRef<HTMLElement>(null);
  const hasTrackedView = useRef(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target || hasTrackedView.current) return;

    const trackView = () => {
      if (hasTrackedView.current) return;
      hasTrackedView.current = true;
      trackEvent("quick_analysis_cta_view", { source });
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
      { threshold: 0.35 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [source]);

  const classes = [
    "quick-analysis-entry-cta",
    variant === "compact" ? "is-compact" : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  return (
    <aside ref={targetRef} className={classes} aria-label="StageLab Quick Analysis">
      <div className="quick-analysis-entry-copy">
        <span className="stat-label">StageLab Quick Analysis · {formatQuickAnalysisPrice()} one time</span>
        <Heading level={headingLevel}>{heading}</Heading>
        <p>{description}</p>
      </div>
      <TrackedLink
        className="button button-secondary quick-analysis-entry-button"
        href={getQuickAnalysisEntryHref(source)}
        eventName="quick_analysis_cta_clicked"
        eventParams={{ source }}
      >
        {buttonText} — {formatQuickAnalysisPrice()}
      </TrackedLink>
    </aside>
  );
}
