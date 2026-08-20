export const ANALYTICS_CONSENT_STORAGE_KEY = "elevare_analytics_consent_v1";
export type AnalyticsConsentChoice = "accepted" | "declined";

export function hasAnalyticsConsent() {
  return typeof window !== "undefined"
    && window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) === "accepted";
}
