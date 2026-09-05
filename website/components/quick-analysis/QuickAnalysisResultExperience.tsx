"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  QuickAnalysisPhotoUploader,
  type QuickAnalysisSelectedPhoto,
} from "@/components/quick-analysis/QuickAnalysisPhotoUploader";
import { QuickAnalysisReport } from "@/components/quick-analysis/QuickAnalysisReport";
import { trackEvent } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/config";
import { localizePathname } from "@/lib/i18n/config";
import type { QuickAnalysisMessages } from "@/lib/i18n/quick-analysis-types";
import { normalizeQuickAnalysisSource } from "@/lib/quick-analysis-attribution";
import { prepareQuickAnalysisPhotos } from "@/lib/quick-analysis-client-images";
import {
  QuickAnalysisPollingController,
  type QuickAnalysisPollingStopReason,
} from "@/lib/quick-analysis-polling";
import { markQuickAnalysisRecoveryCandidate } from "@/lib/quick-analysis-recovery-marker";
import {
  QUICK_ANALYSIS_MAX_PHOTOS,
  QUICK_ANALYSIS_MIN_PHOTOS,
  QUICK_ANALYSIS_PHOTO_VIEWS,
  QUICK_ANALYSIS_PRICE_VALUE,
  getMissingQuickAnalysisPhotoViews,
  type QuickAnalysisPhotoView,
  type QuickAnalysisPublicState,
} from "@/lib/quick-analysis";

type StatusPayload = { state?: QuickAnalysisPublicState; error?: string; code?: string };

function localizedError(messages: QuickAnalysisMessages["result"], code: string | undefined, fallback: string) {
  return (code && messages.errors[code]) || fallback;
}

export function QuickAnalysisResultExperience({ locale, messages }: { locale: Locale; messages: QuickAnalysisMessages["result"] }) {
  const searchParams = useSearchParams();
  const attributionSource = useRef(normalizeQuickAnalysisSource(searchParams.get("source")));
  const previewUrls = useRef(new Map<QuickAnalysisPhotoView, string>());
  const photoSetStarted = useRef(false);
  const photoSetCompleted = useRef(false);
  const pollingController = useRef<QuickAnalysisPollingController | null>(null);
  const [state, setState] = useState<QuickAnalysisPublicState | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Partial<Record<QuickAnalysisPhotoView, QuickAnalysisSelectedPhoto>>>({});
  const [photoErrors, setPhotoErrors] = useState<Partial<Record<QuickAnalysisPhotoView, string>>>({});
  const [aiConsent, setAiConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [pollingStopReason, setPollingStopReason] = useState<QuickAnalysisPollingStopReason | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadStatus() {
      try {
        const response = await fetch("/api/quick-analysis/status/", { method: "POST", cache: "no-store" });
        const payload = (await response.json()) as StatusPayload;
        if (!response.ok || !payload.state) throw new Error(localizedError(messages, payload.code, messages.couldNotOpen));
        if (active) {
          markQuickAnalysisRecoveryCandidate();
          setState(payload.state);
        }
      } catch (statusError) {
        if (active) setError(statusError instanceof Error ? statusError.message : messages.couldNotOpen);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadStatus();
    return () => { active = false; };
  }, [messages]);

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
    const controller = new QuickAnalysisPollingController({
      fetchStatus: async (signal) => {
        const response = await fetch("/api/quick-analysis/status/", {
          method: "POST",
          cache: "no-store",
          signal,
        });
        const payload = await response.json().catch(() => ({})) as StatusPayload;
        return { status: response.status, state: response.ok ? payload.state : undefined };
      },
      onState: setState,
      onAutomaticStop: setPollingStopReason,
      isVisible: () => document.visibilityState === "visible",
      subscribeToVisibility: (listener) => {
        document.addEventListener("visibilitychange", listener);
        return () => document.removeEventListener("visibilitychange", listener);
      },
    });
    pollingController.current = controller;
    controller.start();

    return () => {
      controller.dispose();
      if (pollingController.current === controller) pollingController.current = null;
    };
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
    window.history.replaceState({}, "", localizePathname("/stagelab/quick-analysis/result/", locale));
  }, [locale, searchParams, state]);

  function resetPhotos() {
    for (const previewUrl of previewUrls.current.values()) URL.revokeObjectURL(previewUrl);
    previewUrls.current.clear();
    setSelectedPhotos({});
    setPhotoErrors({});
    setAiConsent(false);
    setConsentError(false);
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

  async function handleManualStatusCheck() {
    if (checkingStatus || !pollingController.current) return;
    setCheckingStatus(true);
    await pollingController.current.checkNow();
    setCheckingStatus(false);
  }

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const analysisMode = state?.analysisMode ?? "competition_prep";
    const selectedViews = QUICK_ANALYSIS_PHOTO_VIEWS.filter((view) => Boolean(selectedPhotos[view]));
    const missingViews = getMissingQuickAnalysisPhotoViews(selectedViews);
    if (missingViews.length > 0) {
      setPhotoErrors(Object.fromEntries(missingViews.map((view) => [view, messages.requiredPhoto.replace("{view}", messages.uploader.slots[view].label)])));
      setError(messages.addRequiredPhotos);
      document.getElementById(`quick-analysis-photo-${missingViews[0]}`)?.focus();
      return;
    }
    if (selectedViews.length < QUICK_ANALYSIS_MIN_PHOTOS || selectedViews.length > QUICK_ANALYSIS_MAX_PHOTOS) {
      setError(messages.choosePhotoCount.replace("{min}", String(QUICK_ANALYSIS_MIN_PHOTOS)).replace("{max}", String(QUICK_ANALYSIS_MAX_PHOTOS)));
      return;
    }
    if (!aiConsent) {
      setConsentError(true);
      setError(messages.confirmAiProcessing);
      requestAnimationFrame(() => document.getElementById("quick-analysis-upload-consent")?.focus());
      return;
    }
    setConsentError(false);

    trackEvent("quick_analysis_upload_started", {
      photo_count: selectedViews.length,
      analysis_mode: analysisMode,
      source: attributionSource.current,
    });
    try {
      setProcessingStage(messages.preparingPhotos);
      const prepared = await prepareQuickAnalysisPhotos(selectedViews.map((view) => ({
        view,
        file: selectedPhotos[view]!.file,
      })));
      const form = new FormData();
      form.set("aiConsent", "true");
      prepared.forEach(({ view, file }) => form.set(`photo_${view}`, file));
      setProcessingStage(messages.analyzing);
      const response = await fetch("/api/quick-analysis/analyze/", { method: "POST", body: form });
      const payload = (await response.json()) as StatusPayload;
      if (!response.ok || !payload.state) throw new Error(localizedError(messages, payload.code, messages.couldNotComplete));
      setProcessingStage(messages.buildingReport);
      setPollingStopReason(null);
      setState(payload.state);
      trackEvent("quick_analysis_completed", {
        product: "StageLab Quick Analysis",
        analysis_mode: analysisMode,
        source: attributionSource.current,
      });
      resetPhotos();
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : messages.couldNotComplete);
      trackEvent("quick_analysis_failed", {
        analysis_mode: analysisMode,
        source: attributionSource.current,
      });
    } finally {
      setProcessingStage(null);
    }
  }

  if (loading) {
    return <section className="quick-analysis-state panel" role="status" aria-live="polite" aria-busy="true"><div className="quick-analysis-spinner" aria-hidden="true" /><h1>{messages.opening}</h1><p>{messages.confirmingPurchase}</p></section>;
  }

  if (state?.analysisStatus === "completed" && state.result) {
    return (
      <>
        {state.generationLocale !== locale ? (
          <p className="quick-analysis-language-notice panel" role="status">
            {messages.reportLanguageNotice.replace("{language}", messages.languageLabels[state.generationLocale] ?? state.generationLocale)}
          </p>
        ) : null}
        <QuickAnalysisReport result={state.result} locale={locale} messages={messages.report} />
      </>
    );
  }

  if (state?.analysisStatus === "expired") {
    return <section className="quick-analysis-state panel"><div className="eyebrow">{messages.resultExpired}</div><h1>{messages.expiredTitle}</h1><p>{messages.expiredBody}</p><Link className="button button-primary" href={localizePathname("/stagelab/quick-analysis/", locale)}>{messages.startNew}</Link></section>;
  }

  if (state?.analysisStatus === "processing") {
    return (
      <section className="quick-analysis-state panel" role="status" aria-live="polite" aria-busy={pollingStopReason ? undefined : "true"}>
        <div className="quick-analysis-spinner" aria-hidden="true" />
        <h1>{messages.processingTitle}</h1>
        <p>{pollingStopReason ? messages.pollingPausedBody : messages.processingBody}</p>
        {pollingStopReason ? (
          <button className="button button-secondary" type="button" onClick={() => void handleManualStatusCheck()} disabled={checkingStatus}>
            {checkingStatus ? messages.checkingAgain : messages.checkAgain}
          </button>
        ) : null}
      </section>
    );
  }

  if (!state || !state.canAnalyze) {
    return <section className="quick-analysis-state panel"><div className="eyebrow">{messages.accessUnavailable}</div><h1>{messages.accessTitle}</h1><p>{error || messages.accessBody}</p><Link className="button button-secondary" href={localizePathname("/stagelab/quick-analysis/", locale)}>{messages.backToAnalysis}</Link></section>;
  }

  return (
    <div className="quick-analysis-upload-layout">
      <section className="quick-analysis-upload-copy">
        <div className="eyebrow">{messages.paymentConfirmed}</div>
        <h1>{state.analysisMode === "competition_prep" ? messages.uploadCheckIn : messages.uploadPhysique}</h1>
        <p>{state.analysisMode === "competition_prep"
          ? messages.prepUploadBody
          : messages.physiqueUploadBody}</p>
        <div className="quick-analysis-privacy-note">
          <strong>{messages.photosOnlyTitle}</strong>
          <span>{messages.photosOnlyBody}</span>
        </div>
        <div className="quick-analysis-privacy-note">
          <strong>{messages.browserAccessTitle}</strong>
          <span>{messages.browserAccessBody}</span>
        </div>
      </section>

      <form className="quick-analysis-upload-card panel" onSubmit={handleAnalyze} noValidate>
        <QuickAnalysisPhotoUploader
          mode={state.analysisMode}
          photos={selectedPhotos}
          errors={photoErrors}
          disabled={Boolean(processingStage)}
          onPhotoChange={handlePhotoChange}
          messages={messages.uploader}
        />

        <label className="quick-analysis-check">
          <input id="quick-analysis-upload-consent" type="checkbox" checked={aiConsent} onChange={(event) => { setAiConsent(event.target.checked); setConsentError(false); }} disabled={Boolean(processingStage)} aria-invalid={consentError} aria-describedby={consentError ? "quick-analysis-upload-consent-error" : undefined} />
          <span>{messages.uploadConsentBefore}<a href="/privacy-policy/" hrefLang="en">{messages.privacyPolicy}</a>{messages.uploadConsentAfter}</span>
        </label>
        {consentError ? <p className="field-error" id="quick-analysis-upload-consent-error">{messages.confirmAiProcessing}</p> : null}

        <button className="button button-primary" type="submit" disabled={Boolean(processingStage)}>
          {processingStage || messages.analyzePhotos}
        </button>
        {processingStage ? <div className="quick-analysis-processing" role="status" aria-live="polite" aria-busy="true"><div className="quick-analysis-spinner" aria-hidden="true" /><div><strong>{processingStage}</strong><span>{messages.keepOpen}</span></div></div> : null}
        {error ? <p className="form-feedback is-error" role="alert">{error}</p> : null}
        <p className="fine-print">{messages.retryBody} {messages.attemptsUsed}: {state.retryCount} {messages.of} {state.maxRetries}.</p>
      </form>
    </div>
  );
}
