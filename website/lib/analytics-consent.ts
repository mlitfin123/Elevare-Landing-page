export const ANALYTICS_CONSENT_STORAGE_KEY = "elevare_analytics_consent_v1";
export type AnalyticsConsentChoice = "accepted" | "declined";

export function readAnalyticsConsentChoice(): AnalyticsConsentChoice | null {
  if (typeof window === "undefined") return null;

  try {
    const storedChoice = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return storedChoice === "accepted" || storedChoice === "declined" ? storedChoice : null;
  } catch {
    return null;
  }
}

export function storeAnalyticsConsentChoice(choice: AnalyticsConsentChoice) {
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, choice);
  } catch {
    // Keep the in-memory choice for this visit when browser storage is unavailable.
  }
}

export function hasAnalyticsConsent() {
  return readAnalyticsConsentChoice() === "accepted";
}

export function buildGoogleAnalyticsBootstrap(measurementId: string) {
  const storageKey = JSON.stringify(ANALYTICS_CONSENT_STORAGE_KEY);
  const tagId = JSON.stringify(measurementId);

  return `
(function () {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  var storedChoice = null;
  try {
    storedChoice = window.localStorage.getItem(${storageKey});
  } catch (_) {}

  window.gtag("consent", "default", {
    analytics_storage: storedChoice === "accepted" ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  });
  window.gtag("set", "ads_data_redaction", true);
  window.gtag("set", "allow_ad_personalization_signals", false);
  window.gtag("js", new Date());
  window.gtag("config", ${tagId}, { send_page_view: false });
})();`;
}
