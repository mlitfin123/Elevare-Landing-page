import { readAnalyticsConsentChoice } from "./analytics-consent.ts";

export const PROFILE_VIEW_CHOICE_KEY = "elevare_profile_statistics_v1";
export const PROFILE_VIEW_CHOICE_EVENT = "elevare:profile-statistics-change";
export type ProfileViewChoice = "accepted" | "declined" | null;
let volatileChoice: ProfileViewChoice = null;

export function normalizeProfileViewChoice(value: unknown): ProfileViewChoice {
  return value === "accepted" || value === "declined" ? value : null;
}

export function hasBrowserPrivacySignal() {
  return typeof navigator !== "undefined" && (
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
    || navigator.doNotTrack === "1"
  );
}

export function readProfileViewChoice(): ProfileViewChoice {
  if (typeof window === "undefined") return null;
  if (hasBrowserPrivacySignal()) return "declined";
  if (volatileChoice) return volatileChoice;
  try {
    const choice = normalizeProfileViewChoice(window.localStorage.getItem(PROFILE_VIEW_CHOICE_KEY));
    if (choice) return choice;
  } catch { /* Browser storage can be unavailable. */ }
  // Preserve earlier declines; never silently opt an existing visitor back in.
  return readAnalyticsConsentChoice() === "declined" ? "declined" : null;
}

export function storeProfileViewChoice(choice: Exclude<ProfileViewChoice, null>) {
  try { window.localStorage.setItem(PROFILE_VIEW_CHOICE_KEY, choice); volatileChoice = null; }
  catch { volatileChoice = choice; }
  window.dispatchEvent(new CustomEvent(PROFILE_VIEW_CHOICE_EVENT, { detail: choice }));
}

export function clearLegacyProfileViewStorage() {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("elevare:professional-profile-view:")) window.localStorage.removeItem(key);
    }
  } catch { /* Obsolete tracking data is never read or used when storage is blocked. */ }
}

// Narrow launch policy. Country comes only from Vercel's request metadata,
// never the browser locale. Unknown and other countries remain consent-first.
const AGGREGATE_OPT_OUT_COUNTRIES = new Set(["US", "GB", "FR"]);

export function mayRecordAggregateProfileView(input: {
  profileChoice: ProfileViewChoice;
  analyticsChoice: ProfileViewChoice;
  privacySignal: boolean;
  country: string | null;
}) {
  if (input.privacySignal || input.profileChoice === "declined") return false;
  if (input.profileChoice === "accepted") return true;
  if (input.analyticsChoice === "declined") return false;
  return AGGREGATE_OPT_OUT_COUNTRIES.has(input.country?.toUpperCase() ?? "");
}
