import type { QuickAnalysisPublicState } from "./quick-analysis.ts";

export const QUICK_ANALYSIS_POLL_TIMEOUT_MS = 3 * 60 * 1_000;
export const QUICK_ANALYSIS_RATE_LIMIT_STOP_COUNT = 3;

export type QuickAnalysisPollingStopReason = "timeout" | "rate_limited";

export type QuickAnalysisStatusCheck = {
  status: number;
  state?: QuickAnalysisPublicState;
};

type TimerHandle = ReturnType<typeof setTimeout>;

type QuickAnalysisPollingOptions = {
  fetchStatus: (signal: AbortSignal) => Promise<QuickAnalysisStatusCheck>;
  onState: (state: QuickAnalysisPublicState) => void;
  onAutomaticStop: (reason: QuickAnalysisPollingStopReason) => void;
  isVisible: () => boolean;
  subscribeToVisibility: (listener: () => void) => () => void;
  now?: () => number;
  setTimer?: (callback: () => void, delay: number) => TimerHandle;
  clearTimer?: (timer: TimerHandle) => void;
  timeoutMs?: number;
};

export function getQuickAnalysisPollDelay(attempt: number) {
  if (attempt <= 4) return 3_000;
  if (attempt <= 8) return 6_000;
  if (attempt <= 12) return 10_000;
  return 15_000;
}

export class QuickAnalysisPollingController {
  private readonly fetchStatus: QuickAnalysisPollingOptions["fetchStatus"];
  private readonly onState: QuickAnalysisPollingOptions["onState"];
  private readonly onAutomaticStop: QuickAnalysisPollingOptions["onAutomaticStop"];
  private readonly isVisible: QuickAnalysisPollingOptions["isVisible"];
  private readonly subscribeToVisibility: QuickAnalysisPollingOptions["subscribeToVisibility"];
  private readonly now: NonNullable<QuickAnalysisPollingOptions["now"]>;
  private readonly setTimer: NonNullable<QuickAnalysisPollingOptions["setTimer"]>;
  private readonly clearTimer: NonNullable<QuickAnalysisPollingOptions["clearTimer"]>;
  private readonly timeoutMs: number;
  private timer: TimerHandle | null = null;
  private requestController: AbortController | null = null;
  private unsubscribeVisibility: (() => void) | null = null;
  private startedAt = 0;
  private hiddenAt: number | null = null;
  private pausedDuration = 0;
  private attempt = 0;
  private consecutiveRateLimits = 0;
  private running = false;
  private disposed = false;
  private inFlight = false;

  constructor(options: QuickAnalysisPollingOptions) {
    this.fetchStatus = options.fetchStatus;
    this.onState = options.onState;
    this.onAutomaticStop = options.onAutomaticStop;
    this.isVisible = options.isVisible;
    this.subscribeToVisibility = options.subscribeToVisibility;
    this.now = options.now ?? Date.now;
    this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay));
    this.clearTimer = options.clearTimer ?? clearTimeout;
    this.timeoutMs = options.timeoutMs ?? QUICK_ANALYSIS_POLL_TIMEOUT_MS;
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.startedAt = this.now();
    this.unsubscribeVisibility = this.subscribeToVisibility(() => this.handleVisibilityChange());

    if (this.isVisible()) {
      this.scheduleNext();
    } else {
      this.hiddenAt = this.now();
    }
  }

  async checkNow() {
    if (this.disposed || this.inFlight) return false;
    await this.runStatusCheck(false);
    return true;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.running = false;
    this.clearScheduledTimer();
    this.requestController?.abort();
    this.requestController = null;
    this.unsubscribeVisibility?.();
    this.unsubscribeVisibility = null;
  }

  private getActiveElapsed() {
    const currentPause = this.hiddenAt === null ? 0 : this.now() - this.hiddenAt;
    return this.now() - this.startedAt - this.pausedDuration - currentPause;
  }

  private clearScheduledTimer() {
    if (this.timer === null) return;
    this.clearTimer(this.timer);
    this.timer = null;
  }

  private scheduleNext(delayOverride?: number) {
    if (!this.running || this.disposed || this.inFlight || !this.isVisible()) return;
    this.clearScheduledTimer();

    const remaining = this.timeoutMs - this.getActiveElapsed();
    if (remaining <= 0) {
      this.stopAutomatically("timeout");
      return;
    }

    const delay = delayOverride ?? getQuickAnalysisPollDelay(this.attempt + 1);
    if (delay > remaining) {
      this.timer = this.setTimer(() => this.stopAutomatically("timeout"), remaining);
      return;
    }

    this.timer = this.setTimer(() => {
      this.timer = null;
      void this.runStatusCheck(true);
    }, delay);
  }

  private async runStatusCheck(automatic: boolean) {
    if (this.disposed || this.inFlight || (automatic && (!this.running || !this.isVisible()))) return;

    this.inFlight = true;
    if (automatic) this.attempt += 1;
    const controller = new AbortController();
    this.requestController = controller;

    try {
      const response = await this.fetchStatus(controller.signal);
      if (this.disposed) return;

      if (response.status === 429) {
        this.consecutiveRateLimits += 1;
        if (automatic && this.consecutiveRateLimits >= QUICK_ANALYSIS_RATE_LIMIT_STOP_COUNT) {
          this.stopAutomatically("rate_limited");
        }
        return;
      }

      this.consecutiveRateLimits = 0;
      if (response.state) {
        this.onState(response.state);
        if (response.state.analysisStatus !== "processing") {
          this.running = false;
          this.clearScheduledTimer();
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        // Transient status failures retain the current processing state.
      }
    } finally {
      if (this.requestController === controller) this.requestController = null;
      this.inFlight = false;
      if (automatic && this.running && !this.disposed && this.isVisible()) this.scheduleNext();
    }
  }

  private handleVisibilityChange() {
    if (!this.running || this.disposed) return;

    if (!this.isVisible()) {
      this.clearScheduledTimer();
      if (this.hiddenAt === null) this.hiddenAt = this.now();
      return;
    }

    if (this.hiddenAt !== null) {
      this.pausedDuration += this.now() - this.hiddenAt;
      this.hiddenAt = null;
    }
    this.scheduleNext(0);
  }

  private stopAutomatically(reason: QuickAnalysisPollingStopReason) {
    if (!this.running || this.disposed) return;
    this.running = false;
    this.clearScheduledTimer();
    this.onAutomaticStop(reason);
  }
}
