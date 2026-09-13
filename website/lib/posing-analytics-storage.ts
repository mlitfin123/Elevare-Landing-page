type StorageProvider = () => Pick<Storage, "getItem" | "setItem"> | undefined;
const browserStorage: StorageProvider = () => typeof window === "undefined" ? undefined : window.sessionStorage;
export function readPosingAnalyticsMarker(key: string, storage: StorageProvider = browserStorage): boolean {
  try { return storage()?.getItem(key) === "true"; } catch { return false; }
}
export function writePosingAnalyticsMarker(key: string, storage: StorageProvider = browserStorage): void {
  try { storage()?.setItem(key, "true"); } catch { /* Optional analytics must never affect a purchase or report. */ }
}
