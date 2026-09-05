export const QUICK_ANALYSIS_RECOVERY_MARKER_KEY = "elevare_quick_analysis_recovery_candidate";
export const QUICK_ANALYSIS_RECOVERY_MARKER_TTL_MS = 72 * 60 * 60 * 1_000;

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function markQuickAnalysisRecoveryCandidate(
  storage: BrowserStorage = window.localStorage,
  now = Date.now(),
) {
  try {
    storage.setItem(QUICK_ANALYSIS_RECOVERY_MARKER_KEY, String(now));
  } catch {
    // Storage can be unavailable in privacy modes; explicit result links still work.
  }
}

export function clearQuickAnalysisRecoveryCandidate(storage: BrowserStorage = window.localStorage) {
  try {
    storage.removeItem(QUICK_ANALYSIS_RECOVERY_MARKER_KEY);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}

export function hasRecentQuickAnalysisRecoveryCandidate(
  storage: BrowserStorage = window.localStorage,
  now = Date.now(),
) {
  try {
    const createdAt = Number(storage.getItem(QUICK_ANALYSIS_RECOVERY_MARKER_KEY));
    const isRecent = Number.isFinite(createdAt)
      && createdAt > 0
      && now >= createdAt
      && now - createdAt <= QUICK_ANALYSIS_RECOVERY_MARKER_TTL_MS;
    if (!isRecent) storage.removeItem(QUICK_ANALYSIS_RECOVERY_MARKER_KEY);
    return isRecent;
  } catch {
    return false;
  }
}

export function hasExplicitQuickAnalysisRecoveryContext(search: string) {
  const params = new URLSearchParams(search);
  return params.has("session_id")
    || params.get("purchase") === "confirmed"
    || params.get("recovery") === "1";
}
