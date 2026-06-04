"use client";

export type AnalyticsEventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (
      command: "event" | "config" | "js",
      target: string | Date,
      params?: AnalyticsEventParams,
    ) => void;
  }
}

export function trackEvent(eventName: string, params: AnalyticsEventParams = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
}

export function trackPageView(pagePath: string, measurementId: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
    send_to: measurementId,
  });
}
