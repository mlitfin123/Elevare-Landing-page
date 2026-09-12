/** Shared with StageLab supabase/functions/_shared/posing-runtime.ts. */
export const POSING_RUNTIME = {
  minVideoSeconds: 5, maxVideoSeconds: 45, minFrames: 4, maxFrames: 16,
  maxVideoBytes: 180 * 1024 * 1024, maxFrameBytes: 5_000_000,
  frameDecodeTimeoutMs: 20_000, uploadTimeoutMs: 5 * 60_000,
  gatewayTimeoutMs: 20_000, providerTimeoutMs: 75_000, routeMaxSeconds: 60,
  outputTokens: 12_000, maxOutputTokens: 20_000,
  pollInitialMs: 4_000, pollMaxMs: 30_000, pollingHorizonMs: 10 * 60_000,
  slowAfterMs: 45_000, staleUploadMs: 2 * 60 * 60_000,
} as const;

/** No artificial duration minimum. For accepted clips all samples precede EOF. */
export function getPosingFrameTimestamps(durationSeconds: number, maxFrames: number = POSING_RUNTIME.maxFrames): number[] {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return [];
  const durationMs = Math.min(durationSeconds, POSING_RUNTIME.maxVideoSeconds) * 1000;
  const lastSafeMs = Math.max(0, Math.ceil(durationMs) - 2);
  const count = Math.min(Math.max(4, Math.floor(maxFrames)), 16, Math.max(4, Math.round(durationSeconds * .55)), lastSafeMs + 1);
  const edge = Math.min(1000, durationMs * .08);
  const start = Math.min(Math.round(edge), lastSafeMs);
  const end = Math.min(Math.round(durationMs - edge), lastSafeMs);
  return Array.from({ length: count }, (_, i) => Math.min(lastSafeMs, Math.round(start + (end - start) * i / Math.max(1, count - 1))));
}
export function posingPollDelay(attempt: number) {
  return Math.min(POSING_RUNTIME.pollMaxMs, POSING_RUNTIME.pollInitialMs * 2 ** Math.min(3, Math.floor(Math.max(0, attempt) / 2)));
}
export function posingOutputTokenBudget(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 8_000 ? Math.min(POSING_RUNTIME.maxOutputTokens, Math.floor(parsed)) : POSING_RUNTIME.outputTokens;
}
