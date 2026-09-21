"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/analytics";
import { stripLocalePrefix } from "@/lib/i18n/config";

type GoogleAnalyticsPageTrackerProps = {
  measurementId: string;
};

export function GoogleAnalyticsPageTracker({
  measurementId,
}: GoogleAnalyticsPageTrackerProps) {
  const pathname = usePathname();
  const isStageLabStart = stripLocalePrefix(pathname) === "/stagelab/start/";
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (isStageLabStart) return;
    if (lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;
    trackPageView(pathname, measurementId);
  }, [isStageLabStart, measurementId, pathname]);

  return null;
}
