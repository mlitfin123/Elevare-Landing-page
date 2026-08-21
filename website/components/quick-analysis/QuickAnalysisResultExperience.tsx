"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  QuickAnalysisPhotoUploader,
  type QuickAnalysisSelectedPhoto,
} from "@/components/quick-analysis/QuickAnalysisPhotoUploader";
import { QuickAnalysisReport } from "@/components/quick-analysis/QuickAnalysisReport";
import { trackEvent } from "@/lib/analytics";
import { normalizeQuickAnalysisSource } from "@/lib/quick-analysis-attribution";
import { prepareQuickAnalysisPhotos } from "@/lib/quick-analysis-client-images";
import {
  QUICK_ANALYSIS_MAX_PHOTOS,
  QUICK_ANALYSIS_MIN_PHOTOS,
  QUICK_ANALYSIS_PHOTO_VIEWS,
  QUICK_ANALYSIS_PRICE_VALUE,
  getMissingQuickAnalysisPhotoViews,
  type QuickAnalysisPhotoView,
  type QuickAnalysisPublicState,
} from "@/lib/quick-analysis";

type StatusPayload = { state?: QuickAnalysisPublicState; error?: string };

export function QuickAnalysisResultExperience() {
  const searchParams = useSearchParams();
  const attributionSource = useRef(normalizeQuickAnalysisSource(searchParams.get("source")));
  const previewUrls = useRef(new Map<QuickAnalysisPhotoView, string>());
  const photoSetStarted = useRef(false);
  const photoSetCompleted = useRef(false);
  const [state, setState] = useState<QuickAnalysisPublicState | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Partial<Record<QuickAnalysisPhotoView, QuickAnalysisSelectedPhoto>>>({});
  const [photoErrors, setPhotoErrors] = useState<Partial<Record<QuickAnalysisPhotoView, string>>>({});
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

  useEffect(() => () => {
    for (const previewUrl of previewUrls.current.values()) URL.revokeObjectURL(previewUrl);
    previewUrls.current.clear();
  }, []);

  useEffect(() => {
    const views = QUICK_ANALYSIS_PHOTO_VIEWS.filter((view) => Boolean(selectedPhotos[view]));
    const analysisMode = state?.analysisMode ?? "competition_prep";
    if (views.length > 0 && !photoSetStarted.current) {
      photoSetStarted.current = true;
      trackEvent("quick_analysis_photo_set_started", {
        analysis_mode: analysisMode,
        source: attributionSource.current,
      });
    }
    if (getMissingQuickAnalysisPhotoViews(views).length === 0 && !photoSetCompleted.current) {
      photoSetCompleted.current = true;
      trackEvent("quick_analysis_photo_set_completed", {
        photo_count: views.length,
        analysis_mode: analysisMode,
        source: attributionSource.current,
      });
    }
  }, [selectedPhotos, state?.analysisMode]);

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
      value: QUICK_ANALYSIS_PRICE_VALUE,
      currency: "USD",
      analysis_mode: state.analysisMode,
      source: attributionSource.current,
    });
    sessionStorage.setItem(key, "true");
    window.history.replaceState({}, "", "/stagelab/quick-analysis/result/");
  }, [searchParams, state]);

  function resetPhotos() {
    for (const previewUrl of previewUrls.current.values()) URL.revokeObjectURL(previewUrl);
    previewUrls.current.clear();
    setSelectedPhotos({});
    setPhotoErrors({});
    setAiConsent(false);
  }

  function handlePhotoChange(view: QuickAnalysisPhotoView, file: File | null) {
    setError(null);
    setPhotoErrors((current) => ({ ...current, [view]: undefined }));
    const previousUrl = previewUrls.current.get(view);
    if (previousUrl) URL.revokeObjectURL(previousUrl);

    if (!file) {
      previewUrls.current.delete(view);
      setSelectedPhotos((current) => {
        const next = { ...current };
        delete next[view];
        return next;
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    previewUrls.current.set(view, previewUrl);
    setSelectedPhotos((current) => ({ ...current, [view]: { file, previewUrl } }));
  }

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const analysisMode = state?.analysisMode ?? "competition_prep";
    const selectedViews = QUICK_ANALYSIS_PHOTO_VIEWS.filter((view) => Boolean(selectedPhotos[view]));
    const missingViews = getMissingQuickAnalysisPhotoViews(selectedViews);
    if (missingViews.length > 0) {
      setPhotoErrors(Object.fromEntries(missingViews.map((view) => [view, `${view[0]?.toUpperCase()}${view.slice(1)} photo is required.`])));
      setError("Add a front, side, and back photo before starting your analysis.");
      document.getElementById(`quick-analysis-photo-${missingViews[0]}`)?.focus();
      return;
    }
    if (selectedViews.length < QUICK_ANALYSIS_MIN_PHOTOS || selectedViews.length > QUICK_ANALYSIS_MAX_PHOTOS) {
      setError(`Choose ${QUICK_ANALYSIS_MIN_PHOTOS}-${QUICK_ANALYSIS_MAX_PHOTOS} photos.`);
      return;
    }
    if (!aiConsent) {
      setError("Confirm AI photo processing before starting your analysis.");
      return;
    }

    trackEvent("quick_analysis_upload_started", {
      photo_count: selectedViews.length,
      analysis_mode: analysisMode,
      source: attributionSource.current,
    });
    try {
      setProcessingStage("Preparing photos");
      const prepared = await prepareQuickAnalysisPhotos(selectedViews.map((view) => ({
        view,
        file: selectedPhotos[view]!.file,
      })));
      const form = new FormData();
      form.set("aiConsent", "true");
      prepared.forEach(({ view, file }) => form.set(`photo_${view}`, file));
      setProcessingStage("Analyzing your check-in...");
      const response = await fetch("/api/quick-analysis/analyze/", { method: "POST", body: form });
      const payload = (await response.json()) as StatusPayload;
      if (!response.ok || !payload.state) throw new Error(payload.error || "The analysis could not be completed.");
      setProcessingStage("Building your report");
      setState(payload.state);
      trackEvent("quick_analysis_completed", {
        product: "StageLab Quick Analysis",
        analysis_mode: analysisMode,
        source: attributionSource.current,
      });
      resetPhotos();
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "The analysis could not be completed.");
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
        <div className="eyebrow">Payment confirmed - StageLab Quick Analysis</div>
        <h1>{state.analysisMode === "competition_prep" ? "Upload your check-in" : "Upload your physique photos"}</h1>
        <p>{state.analysisMode === "competition_prep"
          ? "For the most useful analysis, upload a clear front, side, and back view from the same session."
          : "Upload a clear front, side, and back view. Natural photos are enough for a useful physique assessment."}</p>
        <div className="quick-analysis-privacy-note">
          <strong>Your photos are used only for this analysis.</strong>
          <span>They are prepared in your browser, sent securely to the AI service for transient processing, and discarded after the request completes. ElevareFit never stores them or creates a photo history.</span>
        </div>
        <div className="quick-analysis-privacy-note">
          <strong>This browser keeps your result access.</strong>
          <span>Your report remains available here for 72 hours. Use this same browser and device, and do not clear its cookies until you are finished viewing the result.</span>
        </div>
      </section>

      <form className="quick-analysis-upload-card panel" onSubmit={handleAnalyze} noValidate>
        <QuickAnalysisPhotoUploader
          mode={state.analysisMode}
          photos={selectedPhotos}
          errors={photoErrors}
          disabled={Boolean(processingStage)}
          onPhotoChange={handlePhotoChange}
        />

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
