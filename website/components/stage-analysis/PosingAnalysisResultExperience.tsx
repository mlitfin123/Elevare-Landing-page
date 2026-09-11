"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { PosingAnalysisReport } from "./PosingAnalysisReport";
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
  const route = product === "posing_analysis" ? "posing-analysis" : "complete-stage-analysis";

  async function refreshStatus() {
    const response = await fetch("/api/stage-analysis/status/", { method: "POST", cache: "no-store" });
    const payload = await readPayload(response);
    if (!response.ok || !payload.state) throw new Error(payload.error || messages.unavailable);
    setState(payload.state);
    return payload.state;
  }

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      void refreshStatus()
        .catch((statusError) => {
          if (active) setError(statusError instanceof Error ? statusError.message : messages.unavailable);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
    // Initial access check only; polling is handled separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state || !["awaiting_authorization", "processing"].includes(state.posing.status)) return;
    const interval = window.setInterval(() => { void refreshStatus().catch(() => undefined); }, 3_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.posing.status]);

  useEffect(() => {
    if (searchParams.get("purchase") !== "confirmed" || state?.paymentStatus !== "paid") return;
    const key = `${product}_purchase_tracked`;
    if (sessionStorage.getItem(key)) return;
    trackEvent(product === "posing_analysis" ? "posing_purchase_completed" : "complete_stage_purchase_completed", { product, currency: "USD", value: product === "posing_analysis" ? 0.99 : 1.49, source: source.current });
    sessionStorage.setItem(key, "true");
    window.history.replaceState({}, "", localizePathname(`/stagelab/${route}/result/`, locale));
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
    const key = `stage_analysis_event_${eventName}`;
    if (sessionStorage.getItem(key)) return;
    trackEvent(eventName, { product, source: source.current });
    sessionStorage.setItem(key, "true");
  }, [product, state]);

  async function uploadCapability(capability: UploadCapability, body: Blob) {
    if (body.size > capability.max_bytes) throw new Error(messages.error);
    const response = await fetch(capability.url, { method: capability.method, headers: capability.headers, body, referrerPolicy: "no-referrer" });
    if (!response.ok) throw new Error(messages.error);
  }

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!file || !consent || !state) { setError(messages.error); return; }
    const retry = state.posing.status === "failed_retryable";
    try {
      setBusy(messages.preparingFrames);
      trackEvent(product === "posing_analysis" ? "posing_analysis_started" : "complete_stage_started", { product, source: source.current });
      const prepared = await preparePosingVideo(file);
      const manifest = {
        division: POSING_DIVISION_TO_KEY[state.division],
        locale: state.generationLocale,
        source_type: "uploaded_video" as const,
        video: { file_name: file.name, mime_type: prepared.mimeType, size_bytes: file.size, duration_seconds: prepared.durationSeconds },
        frames: prepared.frames.map((frame) => ({ index: frame.index, timestamp_ms: frame.timestampMs, mime_type: "image/jpeg" as const, size_bytes: frame.blob.size, width: frame.width, height: frame.height })),
        retry,
      };
      const initializeResponse = await fetch("/api/stage-analysis/posing/initialize/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(manifest) });
      const initialized = await readPayload(initializeResponse);
      if (!initializeResponse.ok || !initialized.uploads) throw new Error(initialized.error || messages.error);
      const videoUpload = initialized.uploads.find((item) => item.kind === "video");
      if (!videoUpload) throw new Error(messages.error);
      setBusy(messages.uploading);
      await uploadCapability(videoUpload, prepared.file);
      await Promise.all(prepared.frames.map((frame) => {
        const upload = initialized.uploads!.find((item) => item.kind === "frame" && item.frame_index === frame.index);
        if (!upload) throw new Error(messages.error);
        return uploadCapability(upload, frame.blob);
      }));
      trackEvent("posing_video_upload_completed", { product, source: source.current });
      setBusy(messages.analyzing);
      const startResponse = await fetch("/api/stage-analysis/posing/start/", { method: "POST" });
      const started = await readPayload(startResponse);
      if (!startResponse.ok || !started.state) throw new Error(started.error || messages.error);
      setState(started.state);
      setFile(null);
      setConsent(false);
    } catch (analysisError) {
      const message = analysisError instanceof PosingVideoValidationError || analysisError instanceof Error ? analysisError.message : messages.error;
      setError(message);
      await refreshStatus().catch(() => undefined);
    } finally {
      setBusy(null);
    }
  }

  async function handleResume() {
    setError(null);
    setBusy(messages.analyzing);
    try {
      trackEvent(product === "posing_analysis" ? "posing_analysis_started" : "complete_stage_started", { product, source: source.current, resumed: true });
      const response = await fetch("/api/stage-analysis/posing/start/", { method: "POST" });
      const payload = await readPayload(response);
      if (!response.ok || !payload.state) throw new Error(payload.error || messages.error);
      setState(payload.state);
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : messages.error);
      await refreshStatus().catch(() => undefined);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <section className="quick-analysis-state panel" role="status"><div className="quick-analysis-spinner" aria-hidden="true" /><h1>{messages.opening}</h1><p>{messages.confirming}</p></section>;
  if (state?.posing.status === "expired") return <section className="quick-analysis-state panel"><h1>{messages.expiredTitle}</h1><p>{messages.expiredBody}</p><Link className="button button-primary" href={localizePathname(`/stagelab/${route}/`, locale)}>{messages.back}</Link></section>;
  if (state?.posing.status === "completed" && state.posing.result) return <PosingAnalysisReport result={state.posing.result} product={product} locale={locale} messages={messages} />;
  if (state?.posing.status === "processing") return <section className="quick-analysis-state panel" role="status" aria-live="polite"><div className="quick-analysis-spinner" aria-hidden="true" /><h1>{messages.processingTitle}</h1><p>{messages.processingBody}</p></section>;
  if (state?.posing.canResume) return <section className="quick-analysis-state panel"><div className="eyebrow">StageLab</div><h1>{messages.resume}</h1><p>{error || messages.resumeBody}</p><button className="button button-primary" type="button" onClick={() => void handleResume()} disabled={Boolean(busy)}>{busy || messages.resume}</button></section>;
  if (!state || !state.posing.canUpload) return <section className="quick-analysis-state panel"><h1>{showCompleteHeading ? messages.posingComponent : messages.unavailable}</h1><p>{error || (state?.posing.status === "awaiting_authorization" ? messages.confirming : messages.unavailable)}</p><Link className="button button-secondary" href={localizePathname(`/stagelab/${route}/`, locale)}>{messages.back}</Link></section>;

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
        {error ? <p className="form-feedback is-error" role="alert">{error} {state.posing.status === "failed_retryable" ? messages.paymentValid : ""}</p> : null}
        <p className="fine-print">{messages.attempts}: {state.posing.retryCount} / {state.posing.maxRetries}.</p>
      </form>
    </div>
  );
}
