"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { QuickAnalysisReport } from "@/components/quick-analysis/QuickAnalysisReport";
import { trackEvent } from "@/lib/analytics";
import { prepareQuickAnalysisPhotos } from "@/lib/quick-analysis-client-images";
import {
  QUICK_ANALYSIS_MAX_PHOTOS,
  QUICK_ANALYSIS_MIN_PHOTOS,
  type QuickAnalysisPublicState,
} from "@/lib/quick-analysis";

type StatusPayload = { state?: QuickAnalysisPublicState; error?: string };

export function QuickAnalysisResultExperience() {
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<QuickAnalysisPublicState | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [aiConsent, setAiConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadStatus() {
      try {
        const response = await fetch("/api/quick-analysis/status/", { method: "POST", cache: "no-store" });
        const payload = (await response.json()) as StatusPayload;
        if (!response.ok || !payload.state) throw new Error(payload.error || "This analysis could not be opened.");
        if (active) setState(payload.state);
      } catch (statusError) {
        if (active) setError(statusError instanceof Error ? statusError.message : "This analysis could not be opened.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadStatus();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (state?.analysisStatus !== "processing") return;
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch("/api/quick-analysis/status/", { method: "POST", cache: "no-store" });
        const payload = (await response.json()) as StatusPayload;
        if (response.ok && payload.state) setState(payload.state);
      } catch {
        // Keep the current processing state and let the next poll retry.
      }
    }, 3_000);
    return () => window.clearInterval(interval);
  }, [state?.analysisStatus]);

  useEffect(() => {
    if (searchParams.get("purchase") !== "confirmed" || !state) return;
    const key = "stagelab_quick_analysis_purchase_tracked";
    if (sessionStorage.getItem(key)) return;
    trackEvent("quick_analysis_purchase", {
      product: "StageLab Quick Analysis",
      value: 0.99,
      currency: "USD",
      analysis_mode: state.analysisMode,
    });
    sessionStorage.setItem(key, "true");
    window.history.replaceState({}, "", "/stagelab/quick-analysis/result/");
  }, [searchParams, state]);

  function resetPhotos() {
    setSelectedFiles([]);
    setAiConsent(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSelectedFiles(Array.from(event.target.files ?? []));
  }

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const analysisMode = state?.analysisMode ?? "competition_prep";
    if (selectedFiles.length < QUICK_ANALYSIS_MIN_PHOTOS || selectedFiles.length > QUICK_ANALYSIS_MAX_PHOTOS) {
      setError(`Choose ${QUICK_ANALYSIS_MIN_PHOTOS}-${QUICK_ANALYSIS_MAX_PHOTOS} photos.`);
      return;
    }
    if (!aiConsent) {
      setError("Confirm AI photo processing before starting your analysis.");
      return;
    }

    trackEvent("quick_analysis_upload_started", { photo_count: selectedFiles.length, analysis_mode: analysisMode });
    try {
      setProcessingStage("Preparing photos");
      const prepared = await prepareQuickAnalysisPhotos(selectedFiles);
      const form = new FormData();
      form.set("aiConsent", "true");
      prepared.forEach((file) => form.append("photos", file));
      setProcessingStage("Analyzing your check-in...");
      const response = await fetch("/api/quick-analysis/analyze/", { method: "POST", body: form });
      const payload = (await response.json()) as StatusPayload;
      if (!response.ok || !payload.state) throw new Error(payload.error || "The analysis could not be completed.");
      setProcessingStage("Building your report");
      setState(payload.state);
      trackEvent("quick_analysis_completed", { product: "StageLab Quick Analysis", analysis_mode: analysisMode });
      resetPhotos();
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "The analysis could not be completed.");
      resetPhotos();
    } finally {
      setProcessingStage(null);
    }
  }

  if (loading) {
    return <section className="quick-analysis-state panel"><div className="quick-analysis-spinner" aria-hidden="true" /><h1>Opening your analysis...</h1><p>Confirming your one-time purchase securely.</p></section>;
  }

  if (state?.analysisStatus === "completed" && state.result) {
    return <QuickAnalysisReport result={state.result} />;
  }

  if (state?.analysisStatus === "expired") {
    return <section className="quick-analysis-state panel"><div className="eyebrow">Result expired</div><h1>This analysis is no longer available.</h1><p>Quick Analysis results are available for 72 hours. Start a new analysis if you would like another current snapshot.</p><Link className="button button-primary" href="/stagelab/quick-analysis/">Start a new analysis</Link></section>;
  }

  if (state?.analysisStatus === "processing") {
    return <section className="quick-analysis-state panel"><div className="quick-analysis-spinner" aria-hidden="true" /><h1>Your analysis is processing.</h1><p>Keep this page open. The report will appear here when it is ready.</p></section>;
  }

  if (!state || !state.canAnalyze) {
    return <section className="quick-analysis-state panel"><div className="eyebrow">Access unavailable</div><h1>We couldn&apos;t open this analysis.</h1><p>{error || "Return from your completed Stripe checkout, or contact support if payment was completed."}</p><Link className="button button-secondary" href="/stagelab/quick-analysis/">Back to Quick Analysis</Link></section>;
  }

  return (
    <div className="quick-analysis-upload-layout">
      <section className="quick-analysis-upload-copy">
        <div className="eyebrow">Payment confirmed</div>
        <h1>Upload your current physique photos.</h1>
        <p>Choose 3-5 clear current photos. Front, side, and back views in consistent lighting provide the most useful snapshot.</p>
        <div className="quick-analysis-privacy-note">
          <strong>Your photos are used only for this analysis.</strong>
          <span>They are prepared in your browser, sent securely to the AI service for transient processing, and discarded after the request completes. ElevareFit never stores them or creates a photo history.</span>
        </div>
        <div className="quick-analysis-privacy-note">
          <strong>This browser keeps your result access.</strong>
          <span>Your report remains available here for 72 hours. Use this same browser and device, and do not clear its cookies until you are finished viewing the result.</span>
        </div>
      </section>

      <form className="quick-analysis-upload-card panel" onSubmit={handleAnalyze}>
        <label className="quick-analysis-file-picker">
          <span className="stat-label">Current photos</span>
          <strong>{selectedFiles.length ? `${selectedFiles.length} photos selected` : "Choose 3-5 photos"}</strong>
          <small>JPEG, PNG, or WebP. Front, side, and back views recommended.</small>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} disabled={Boolean(processingStage)} />
        </label>

        {selectedFiles.length ? (
          <div className="quick-analysis-file-summary" aria-live="polite">
            {selectedFiles.map((file, index) => <span key={`${file.name}-${file.lastModified}-${index}`}>Photo {index + 1} - {(file.size / 1_000_000).toFixed(1)} MB</span>)}
          </div>
        ) : null}

        <label className="quick-analysis-check">
          <input type="checkbox" checked={aiConsent} onChange={(event) => setAiConsent(event.target.checked)} disabled={Boolean(processingStage)} />
          <span>I understand that these photos will be used only for this one-time analysis, sent to an AI service for processing, and never stored by ElevareFit. They are discarded after processing. See the <Link href="/privacy-policy/">Privacy Policy</Link>.</span>
        </label>

        <button className="button button-primary" type="submit" disabled={Boolean(processingStage)}>
          {processingStage || "Analyze my photos"}
        </button>
        {processingStage ? <div className="quick-analysis-processing" role="status"><div className="quick-analysis-spinner" aria-hidden="true" /><div><strong>{processingStage}</strong><span>Keep this page open while the report is prepared.</span></div></div> : null}
        {error ? <p className="form-feedback is-error" role="alert">{error}</p> : null}
        <p className="fine-print">If a technical issue prevents delivery, your paid entitlement remains valid for another upload attempt. You will not be charged again. Attempts used: {state.retryCount} of {state.maxRetries}.</p>
      </form>
    </div>
  );
}
