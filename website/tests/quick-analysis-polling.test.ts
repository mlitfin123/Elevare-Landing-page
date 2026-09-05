import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  QUICK_ANALYSIS_RATE_LIMIT_STOP_COUNT,
  QuickAnalysisPollingController,
  getQuickAnalysisPollDelay,
  type QuickAnalysisStatusCheck,
} from "../lib/quick-analysis-polling.ts";
import {
  QUICK_ANALYSIS_RECOVERY_MARKER_KEY,
  QUICK_ANALYSIS_RECOVERY_MARKER_TTL_MS,
  hasExplicitQuickAnalysisRecoveryContext,
  hasRecentQuickAnalysisRecoveryCandidate,
  markQuickAnalysisRecoveryCandidate,
} from "../lib/quick-analysis-recovery-marker.ts";
import type { QuickAnalysisPublicState } from "../lib/quick-analysis.ts";

type TimerHandle = ReturnType<typeof setTimeout>;

const processingState = (analysisStatus: QuickAnalysisPublicState["analysisStatus"] = "processing"): QuickAnalysisPublicState => ({
  analysisMode: "competition_prep",
  generationLocale: "en",
  paymentStatus: "paid",
  analysisStatus,
  canAnalyze: analysisStatus !== "completed",
  retryCount: 0,
  maxRetries: 3,
  expiresAt: "2026-09-07T00:00:00.000Z",
  result: null,
});

class FakeClock {
  now = 0;
  delays: number[] = [];
  private nextId = 1;
  private timers = new Map<number, { at: number; callback: () => void }>();

  setTimer = (callback: () => void, delay: number) => {
    const id = this.nextId++;
    this.delays.push(delay);
    this.timers.set(id, { at: this.now + delay, callback });
    return id as unknown as TimerHandle;
  };

  clearTimer = (timer: TimerHandle) => {
    this.timers.delete(timer as unknown as number);
  };

  timerCount() {
    return this.timers.size;
  }

  async runNext() {
    const next = [...this.timers.entries()].sort((left, right) => left[1].at - right[1].at)[0];
    if (!next) return false;
    const [id, timer] = next;
    this.timers.delete(id);
    this.now = timer.at;
    timer.callback();
    await new Promise<void>((resolve) => setImmediate(resolve));
    return true;
  }
}

function createVisibility() {
  let visible = true;
  const listeners = new Set<() => void>();
  return {
    isVisible: () => visible,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setVisible(nextVisible: boolean) {
      visible = nextVisible;
      listeners.forEach((listener) => listener());
    },
    listenerCount: () => listeners.size,
  };
}

function createController(options: {
  clock: FakeClock;
  visibility?: ReturnType<typeof createVisibility>;
  fetchStatus: (signal: AbortSignal) => Promise<QuickAnalysisStatusCheck>;
  onState?: (state: QuickAnalysisPublicState) => void;
  onStop?: (reason: "timeout" | "rate_limited") => void;
  timeoutMs?: number;
}) {
  const visibility = options.visibility ?? createVisibility();
  return {
    visibility,
    controller: new QuickAnalysisPollingController({
      fetchStatus: options.fetchStatus,
      onState: options.onState ?? (() => undefined),
      onAutomaticStop: options.onStop ?? (() => undefined),
      isVisible: visibility.isVisible,
      subscribeToVisibility: visibility.subscribe,
      now: () => options.clock.now,
      setTimer: options.clock.setTimer,
      clearTimer: options.clock.clearTimer,
      timeoutMs: options.timeoutMs,
    }),
  };
}

test("Quick Analysis polling uses progressive delays", () => {
  assert.deepEqual(
    [1, 4, 5, 8, 9, 12, 13].map(getQuickAnalysisPollDelay),
    [3_000, 3_000, 6_000, 6_000, 10_000, 10_000, 15_000],
  );
});

test("Quick Analysis polling stops as soon as a terminal result completes", async () => {
  const clock = new FakeClock();
  const states: QuickAnalysisPublicState[] = [];
  const { controller } = createController({
    clock,
    fetchStatus: async () => ({ status: 200, state: processingState("completed") }),
    onState: (state) => states.push(state),
  });

  controller.start();
  await clock.runNext();

  assert.equal(states[0]?.analysisStatus, "completed");
  assert.equal(clock.timerCount(), 0);
  controller.dispose();
});

test("delayed processing progressively backs off instead of polling every three seconds forever", async () => {
  const clock = new FakeClock();
  const { controller } = createController({
    clock,
    fetchStatus: async () => ({ status: 200, state: processingState() }),
  });

  controller.start();
  for (let index = 0; index < 4; index += 1) await clock.runNext();

  assert.deepEqual(clock.delays.slice(0, 5), [3_000, 3_000, 3_000, 3_000, 6_000]);
  controller.dispose();
});

test("hidden tabs pause polling and visible tabs resume with an immediate check", async () => {
  const clock = new FakeClock();
  const visibility = createVisibility();
  let calls = 0;
  const { controller } = createController({
    clock,
    visibility,
    fetchStatus: async () => {
      calls += 1;
      return { status: 200, state: processingState() };
    },
  });

  controller.start();
  visibility.setVisible(false);
  assert.equal(clock.timerCount(), 0);
  visibility.setVisible(true);
  assert.equal(clock.delays.at(-1), 0);
  await clock.runNext();
  assert.equal(calls, 1);
  controller.dispose();
});

test("automatic polling stops at its time budget and leaves manual checks available", async () => {
  const clock = new FakeClock();
  const reasons: string[] = [];
  const states: QuickAnalysisPublicState[] = [];
  const { controller } = createController({
    clock,
    timeoutMs: 100,
    fetchStatus: async () => ({ status: 200, state: processingState("completed") }),
    onState: (state) => states.push(state),
    onStop: (reason) => reasons.push(reason),
  });

  controller.start();
  await clock.runNext();
  assert.deepEqual(reasons, ["timeout"]);

  assert.equal(await controller.checkNow(), true);
  assert.equal(states[0]?.analysisStatus, "completed");
  controller.dispose();
});

test("repeated 429 responses stop automatic polling without creating a failure state", async () => {
  const clock = new FakeClock();
  const reasons: string[] = [];
  const states: QuickAnalysisPublicState[] = [];
  const { controller } = createController({
    clock,
    fetchStatus: async () => ({ status: 429 }),
    onState: (state) => states.push(state),
    onStop: (reason) => reasons.push(reason),
  });

  controller.start();
  for (let index = 0; index < QUICK_ANALYSIS_RATE_LIMIT_STOP_COUNT; index += 1) await clock.runNext();

  assert.deepEqual(reasons, ["rate_limited"]);
  assert.equal(states.length, 0);
  assert.equal(clock.timerCount(), 0);
  controller.dispose();
});

test("manual status checks cannot overlap", async () => {
  const clock = new FakeClock();
  let calls = 0;
  let resolveRequest!: (value: QuickAnalysisStatusCheck) => void;
  const { controller } = createController({
    clock,
    fetchStatus: async () => {
      calls += 1;
      return new Promise<QuickAnalysisStatusCheck>((resolve) => {
        resolveRequest = resolve;
      });
    },
  });

  const first = controller.checkNow();
  assert.equal(await controller.checkNow(), false);
  assert.equal(calls, 1);
  resolveRequest({ status: 200, state: processingState("completed") });
  assert.equal(await first, true);
  controller.dispose();
});

test("disposing the poller clears timers, visibility listeners, and in-flight requests", async () => {
  const clock = new FakeClock();
  const visibility = createVisibility();
  let aborted = false;
  const { controller } = createController({
    clock,
    visibility,
    fetchStatus: (signal) => new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => {
        aborted = true;
        reject(new DOMException("Aborted", "AbortError"));
      });
      void resolve;
    }),
  });

  controller.start();
  await clock.runNext();
  controller.dispose();
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.equal(aborted, true);
  assert.equal(clock.timerCount(), 0);
  assert.equal(visibility.listenerCount(), 0);
});

test("the recovery marker stores only a recent timestamp and expires after 72 hours", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  const createdAt = 1_800_000_000_000;

  markQuickAnalysisRecoveryCandidate(storage, createdAt);
  assert.equal(values.get(QUICK_ANALYSIS_RECOVERY_MARKER_KEY), String(createdAt));
  assert.equal(hasRecentQuickAnalysisRecoveryCandidate(storage, createdAt + 1_000), true);
  assert.equal(hasRecentQuickAnalysisRecoveryCandidate(storage, createdAt + QUICK_ANALYSIS_RECOVERY_MARKER_TTL_MS + 1), false);
  assert.equal(values.has(QUICK_ANALYSIS_RECOVERY_MARKER_KEY), false);
});

test("explicit recovery context remains eligible without a local marker", () => {
  assert.equal(hasExplicitQuickAnalysisRecoveryContext("?session_id=cs_test_123"), true);
  assert.equal(hasExplicitQuickAnalysisRecoveryContext("?purchase=confirmed"), true);
  assert.equal(hasExplicitQuickAnalysisRecoveryContext("?recovery=1"), true);
  assert.equal(hasExplicitQuickAnalysisRecoveryContext("?source=stagelab"), false);
});

test("result and landing components use the bounded poller and marker-gated status flow", () => {
  const root = process.cwd();
  const resultComponent = fs.readFileSync(path.join(root, "components", "quick-analysis", "QuickAnalysisResultExperience.tsx"), "utf8");
  const returnLink = fs.readFileSync(path.join(root, "components", "quick-analysis", "QuickAnalysisReturnLink.tsx"), "utf8");
  const checkout = fs.readFileSync(path.join(root, "components", "quick-analysis", "QuickAnalysisCheckout.tsx"), "utf8");

  assert.match(resultComponent, /QuickAnalysisPollingController/);
  assert.doesNotMatch(resultComponent, /setInterval/);
  assert.match(resultComponent, /messages\.checkAgain/);
  assert.match(returnLink, /hasRecentQuickAnalysisRecoveryCandidate/);
  assert.match(returnLink, /hasExplicitQuickAnalysisRecoveryContext/);
  assert.match(checkout, /markQuickAnalysisRecoveryCandidate/);
});
