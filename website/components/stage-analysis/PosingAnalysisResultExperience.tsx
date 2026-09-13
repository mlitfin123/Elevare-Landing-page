"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { PosingAnalysisReport } from "./PosingAnalysisReport";
import { PosingRequestError } from "@/lib/posing-request-error";
import { getPosingMessages, posingErrorMessage } from "@/lib/i18n/posing-messages";
import { readPosingAnalyticsMarker, writePosingAnalyticsMarker } from "@/lib/posing-analytics-storage";
import { POSING_RUNTIME, posingPollDelay } from "@/lib/posing-runtime";
import { trackEvent } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import type { StageAnalysisMessages } from "@/lib/i18n/stage-analysis-messages";
import { normalizeQuickAnalysisSource } from "@/lib/quick-analysis-attribution";
import { preparePosingVideo, PosingVideoValidationError } from "@/lib/posing-video-client";
import {
  POSING_DIVISION_TO_KEY,
  type PaidStageAnalysisProduct,
  type StageAnalysisPublicState,
} from "@/lib/stage-analysis";

type StatusPayload = { state?: StageAnalysisPublicState; error?: string; code?: string };
type UploadCapability = { kind: "video" | "frame"; frame_index: number | null; method: "PUT"; url: string; headers: Record<string, string>; max_bytes: number };

async function readPayload(response: Response) {
  return response.json().catch(() => ({})) as Promise<StatusPayload & { uploads?: UploadCapability[] }>;
}

export function PosingAnalysisResultExperience({
  product,
  locale,
  messages,
  showCompleteHeading = false,
}: {
  product: PaidStageAnalysisProduct;
  locale: Locale;
  messages: StageAnalysisMessages["result"];
  showCompleteHeading?: boolean;
}) {
  const searchParams = useSearchParams();
  const source = useRef(normalizeQuickAnalysisSource(searchParams.get("source")));
  const [state, setState] = useState<StageAnalysisPublicState | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const m = getPosingMessages(locale);
  const tracked = useRef(new Set<string>());
  const focusOnComplete = useRef(false);
  const mounted = useRef(true);
  const [pollCycle, setPollCycle] = useState(0);
  const [pollPaused, setPollPaused] = useState(false);
  const [slow, setSlow] = useState(false);
  const route = product === "posing_analysis" ? "posing-analysis" : "complete-stage-analysis";

  const refreshStatus = useCallback(async () => {
    const response = await fetch("/api/stage-analysis/status/", { method: "POST", cache: "no-store", headers: { "X-StageLab-Locale": locale }, signal: AbortSignal.timeout(POSING_RUNTIME.gatewayTimeoutMs + 5_000) }).catch(() => { throw new PosingRequestError("status_unavailable", locale); });
    const payload = await readPayload(response);
    if (!response.ok || !payload.state) throw new PosingRequestError(payload.code, locale);
    if (mounted.current) setState(payload.state);
    return payload.state;
  }, [locale]);

  useEffect(() => {
    mounted.current = true;
    void refreshStatus().catch((e) => { if (mounted.current) setError(e instanceof PosingRequestError ? e.message : m.unavailable); })
      .finally(() => { if (mounted.current) setLoading(false); });
    return () => { mounted.current = false; };
  }, [refreshStatus, m.unavailable]);

  useEffect(() => {
    if (!state || !["awaiting_authorization", "processing"].includes(state.posing.status) || state.posing.errorCode === "RESULT_FORMAT_UNAVAILABLE") return;
    let active = true, attempt = 0;
    const began = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = await refreshStatus();
        if (!active || !["awaiting_authorization", "processing"].includes(next.posing.status) || next.posing.errorCode === "RESULT_FORMAT_UNAVAILABLE") return;
      } catch { /* Temporary connectivity loss does not restart a paid job. */ }
      if (!active) return;
      const elapsed = Date.now() - began;
      setSlow(elapsed >= POSING_RUNTIME.slowAfterMs);
      if (elapsed >= POSING_RUNTIME.pollingHorizonMs) { setPollPaused(true); return; }
      timer = setTimeout(() => void poll(), posingPollDelay(attempt++));
    }
    timer = setTimeout(() => void poll(), posingPollDelay(attempt++));
    return () => { active = false; clearTimeout(timer); };
    // Polling owns its elapsed time; individual status responses do not reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.posing.status, state?.posing.analysisId, state?.posing.errorCode === "RESULT_FORMAT_UNAVAILABLE", refreshStatus, pollCycle]);

  useEffect(() => {
    if (state?.posing.status === "completed" && state.posing.result && focusOnComplete.current) {
      focusOnComplete.current = false;
      document.getElementById("posing-report-heading")?.focus();
    }
  }, [state]);

  function optionalAnalytics(event: string, params: Parameters<typeof trackEvent>[1], key?: string) {
    if (key && (tracked.current.has(key) || readPosingAnalyticsMarker(key))) return;
    if (key) tracked.current.add(key);
    try { trackEvent(event, params); } catch { /* Analytics never controls access. */ }
    if (key) writePosingAnalyticsMarker(key);
  }

  async function checkAgain() {
    setError(null); setPollPaused(false); setSlow(false); setPollCycle((value) => value + 1);
    try { await refreshStatus(); } catch (e) { setError(e instanceof PosingRequestError ? e.message : m.genericError); }
  }

  useEffect(() => {
    if (searchParams.get("purchase") !== "confirmed" || state?.paymentStatus !== "paid") return;
    const key = `${product}_purchase_${state.expiresAt}_tracked`;
    optionalAnalytics(product === "posing_analysis" ? "posing_purchase_completed" : "complete_stage_purchase_completed", { product, currency: "USD", value: product === "posing_analysis" ? 0.99 : 1.49, source: source.current }, key);
    try { window.history.replaceState({}, "", localizePathname(`/stagelab/${route}/result/`, locale)); } catch { /* Optional URL cleanup. */ }
  }, [locale, product, route, searchParams, state]);

  useEffect(() => {
    if (!state) return;
    let eventName: string | null = null;
    if (product === "posing_analysis") {
      if (state.posing.status === "completed") eventName = "posing_analysis_completed";
      if (state.posing.status === "failed_retryable") eventName = "posing_analysis_failed";
    } else if (state.physique.status === "completed" && state.posing.status === "completed") {
      eventName = "complete_stage_completed";
    } else if (
      (state.physique.status === "completed" && state.posing.status === "failed_retryable") ||
      (state.posing.status === "completed" && state.physique.status === "failed_retryable")
    ) {
      eventName = "complete_stage_partial";
    } else if (state.physique.status === "failed_retryable" && state.posing.status === "failed_retryable") {
      eventName = "complete_stage_failed";
    }
    if (!eventName) return;
    const key = `stage_analysis_event_${state.posing.analysisId ?? state.expiresAt}_${eventName}`;
    optionalAnalytics(eventName, { product, source: source.current }, key);
  }, [product, state]);

  async function uploadCapability(capability: UploadCapability, body: Blob) {
    if (body.size > capability.max_bytes) throw new PosingRequestError("upload_incomplete", locale);
    const response = await fetch(capability.url, { method: capability.method, headers: capability.headers, body, referrerPolicy: "no-referrer", signal: AbortSignal.timeout(POSING_RUNTIME.uploadTimeoutMs) });
    if (!response.ok) throw new PosingRequestError("upload_incomplete", locale);
  }

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!file || !consent || !state) { setError(messages.error); return; }
    focusOnComplete.current = true;
    setPollPaused(false); setSlow(false);
    const retry = state.posing.status === "failed_retryable";
    try {
      setBusy(messages.preparingFrames);
      optionalAnalytics(product === "posing_analysis" ? "posing_analysis_started" : "complete_stage_started", { product, source: source.current });
      const prepared = await preparePosingVideo(file);
      const manifest = {
        division: POSING_DIVISION_TO_KEY[state.division],
        locale: state.generationLocale,
        source_type: "uploaded_video" as const,
        video: { file_name: file.name, mime_type: prepared.mimeType, size_bytes: file.size, duration_seconds: prepared.durationSeconds },
        frames: prepared.frames.map((frame) => ({ index: frame.index, timestamp_ms: frame.timestampMs, mime_type: "image/jpeg" as const, size_bytes: frame.blob.size, width: frame.width, height: frame.height })),
        retry,
      };
      const initializeResponse = await fetch("/api/stage-analysis/posing/initialize/", { method: "POST", headers: { "Content-Type": "application/json", "X-StageLab-Locale": locale }, body: JSON.stringify(manifest), signal: AbortSignal.timeout(POSING_RUNTIME.gatewayTimeoutMs + 5_000) });
      const initialized = await readPayload(initializeResponse);
      if (!initializeResponse.ok || !initialized.uploads) throw new PosingRequestError(initialized.code, locale);
      const videoUpload = initialized.uploads.find((item) => item.kind === "video");
      if (!videoUpload) throw new PosingRequestError("upload_incomplete", locale);
      setBusy(messages.uploading);
      await uploadCapability(videoUpload, prepared.file);
      await Promise.all(prepared.frames.map((frame) => {
        const upload = initialized.uploads!.find((item) => item.kind === "frame" && item.frame_index === frame.index);
        if (!upload) throw new PosingRequestError("upload_incomplete", locale);
        return uploadCapability(upload, frame.blob);
      }));
      optionalAnalytics("posing_video_upload_completed", { product, source: source.current });
      setBusy(messages.analyzing);
      const startResponse = await fetch("/api/stage-analysis/posing/start/", { method: "POST", headers: { "X-StageLab-Locale": locale }, signal: AbortSignal.timeout(POSING_RUNTIME.gatewayTimeoutMs * 2 + 5_000) });
      const started = await readPayload(startResponse);
      if (!startResponse.ok || !started.state) throw new PosingRequestError(started.code, locale);
      setState(started.state);
      setFile(null);
      setConsent(false);
    } catch (analysisError) {
      const message = analysisError instanceof PosingVideoValidationError ? posingErrorMessage(analysisError.code, locale) : analysisError instanceof PosingRequestError ? analysisError.message : m.uploadError;
      setError(message);
      await refreshStatus().catch(() => undefined);
    } finally {
      setBusy(null);
    }
  }

  async function handleResume() {
    setError(null);
    setBusy(messages.analyzing);
    focusOnComplete.current = true;
    try {
      optionalAnalytics(product === "posing_analysis" ? "posing_analysis_started" : "complete_stage_started", { product, source: source.current, resumed: true });
      const response = await fetch("/api/stage-analysis/posing/start/", { method: "POST", headers: { "X-StageLab-Locale": locale }, signal: AbortSignal.timeout(POSING_RUNTIME.gatewayTimeoutMs * 2 + 5_000) });
      const payload = await readPayload(response);
      if (!response.ok || !payload.state) throw new PosingRequestError(payload.code, locale);
      setState(payload.state);
    } catch (resumeError) {
      setError(resumeError instanceof PosingRequestError ? resumeError.message : m.uploadError);
      await refreshStatus().catch(() => undefined);
    } finally {
      setBusy(null);
    }
  }

  const feedback = error ?? (state?.posing.status === "failed_retryable" && state.posing.errorCode ? posingErrorMessage(state.posing.errorCode, locale) : null);

  if (loading) return <section className="quick-analysis-state panel" role="status"><div className="quick-analysis-spinner" aria-hidden="true" /><h1>{messages.opening}</h1><p>{messages.confirming}</p></section>;
  if (state?.posing.status === "expired") return <section className="quick-analysis-state panel"><h1>{messages.expiredTitle}</h1><p>{messages.expiredBody}</p><Link className="button button-primary" href={localizePathname(`/stagelab/${route}/`, locale)}>{messages.back}</Link></section>;
  if (state?.posing.status === "completed" && state.posing.result) return <PosingAnalysisReport result={state.posing.result} product={product} locale={locale} messages={messages} />;
  if (state?.posing.errorCode === "RESULT_FORMAT_UNAVAILABLE") return <section className="quick-analysis-state panel" role="status"><h1>{m.pausedTitle}</h1><p>{m.reportUnavailable}</p><button className="button button-primary" onClick={() => void checkAgain()}>{m.checkAgain}</button><Link className="button button-secondary" href={localizePathname("/contact/", locale)}>{m.support}</Link></section>;
  if (state?.posing.status === "processing") return <section className="quick-analysis-state panel" role="status" aria-live="polite">{!pollPaused ? <div className="quick-analysis-spinner" aria-hidden="true" /> : null}<h1>{pollPaused ? m.pausedTitle : slow ? m.slowTitle : state.posing.phase === "reserved" ? m.reserved : state.posing.phase === "validating" ? m.validating : m.analyzing}</h1><p>{pollPaused ? m.pausedBody : slow ? m.slowBody : m.pendingBody}</p>{pollPaused ? <button className="button button-primary" onClick={() => void checkAgain()}>{m.checkAgain}</button> : null}{error ? <p role="alert">{error}</p> : null}</section>;
  if (state?.posing.canResume) return <section className="quick-analysis-state panel" role="status"><div className="eyebrow">StageLab</div><h1>{m.resumeTitle}</h1><p>{error || m.resumeBody}</p><button className="button button-primary" type="button" onClick={() => void handleResume()} disabled={Boolean(busy)}>{busy || messages.resume}</button></section>;
  if (!state || !state.posing.canUpload) return <section className="quick-analysis-state panel"><h1>{showCompleteHeading ? messages.posingComponent : messages.unavailable}</h1><p>{error || (state?.posing.status === "awaiting_authorization" ? messages.confirming : m.unavailable)}</p><Link className="button button-secondary" href={localizePathname(`/stagelab/${route}/`, locale)}>{messages.back}</Link></section>;

  return (
    <div className="quick-analysis-upload-layout posing-analysis-upload-layout">
      <section className="quick-analysis-upload-copy"><div className="eyebrow">{messages.paymentConfirmed}</div><h1>{showCompleteHeading ? messages.posingComponent : messages.uploadTitle}</h1><p>{messages.uploadBody}</p><div className="quick-analysis-privacy-note"><strong>{messages.privacyTitle}</strong><span>{messages.privacyBody}</span></div></section>
      <form className="quick-analysis-upload-card panel" onSubmit={handleAnalyze} noValidate>
        <div className="quick-analysis-photo-guide"><strong>{messages.recordingTitle}</strong><ul>{messages.recordingItems.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div className="posing-video-field">
          <span className="field-label">{messages.videoLabel}</span>
          <div className="posing-video-actions">
            <label className="posing-video-picker">{messages.recordVideo}<input type="file" accept="video/*" capture="environment" onChange={(event) => setFile(event.target.files?.[0] ?? null)} disabled={Boolean(busy)} /></label>
            <label className="posing-video-picker">{file ? messages.replaceVideo : messages.uploadVideo}<input type="file" accept="video/mp4,video/quicktime,video/x-m4v,video/webm,video/3gpp,.mp4,.mov,.m4v,.webm,.3gp,.3gpp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} disabled={Boolean(busy)} /></label>
          </div>
          <small>{messages.videoHelp}</small>
          {file ? <span className="posing-video-selected"><strong>{messages.selected}:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MiB)</span> : null}
        </div>
        <label className="quick-analysis-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={Boolean(busy)} /><span>{messages.consent}</span></label>
        <button className="button button-primary" type="submit" disabled={Boolean(busy)}>{busy || (state.posing.status === "failed_retryable" ? messages.retry : messages.analyze)}</button>
        {busy ? <div className="quick-analysis-processing" role="status"><div className="quick-analysis-spinner" aria-hidden="true" /><div><strong>{busy}</strong><span>{messages.keepOpen}</span></div></div> : null}
        {feedback ? <p className="form-feedback is-error" role="alert">{feedback} {state.posing.status === "failed_retryable" ? messages.paymentValid : ""}</p> : null}
        <p className="fine-print">{messages.attempts}: {state.posing.retryCount} / {state.posing.maxRetries}.</p>
      </form>
    </div>
  );
}
