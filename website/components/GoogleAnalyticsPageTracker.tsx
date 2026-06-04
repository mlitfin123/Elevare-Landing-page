"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

type GoogleAnalyticsPageTrackerProps = {
  measurementId: string;
};

export function GoogleAnalyticsPageTracker({
  measurementId,
}: GoogleAnalyticsPageTrackerProps) {
  const pathname = usePathname();

  useEffect(() => {
    trackPageView(pathname, measurementId);
  }, [measurementId, pathname]);

  return null;
}
