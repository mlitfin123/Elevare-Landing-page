"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

type GoogleAnalyticsPageTrackerProps = {
  measurementId: string;
};

export function GoogleAnalyticsPageTracker({
  measurementId,
}: GoogleAnalyticsPageTrackerProps) {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;
    trackPageView(pathname, measurementId);
  }, [measurementId, pathname]);

  return null;
}
