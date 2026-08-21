"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { normalizeQuickAnalysisSource } from "@/lib/quick-analysis-attribution";
import {
  QUICK_ANALYSIS_DIVISIONS,
  QUICK_ANALYSIS_MAX_CONTEXT_LENGTH,
  QUICK_ANALYSIS_PRICE_VALUE,
  formatQuickAnalysisPrice,
  type QuickAnalysisCompetitionStatus,
  type QuickAnalysisDivision,
  type QuickAnalysisMode,
} from "@/lib/quick-analysis";

type CheckoutResponse = { checkoutUrl?: string; error?: string };
type CheckoutField = "analysisMode" | "division" | "weeksOut" | "ageConfirmed" | "aiConsentConfirmed";
type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;

export function QuickAnalysisCheckout() {
  const searchParams = useSearchParams();
  const source = normalizeQuickAnalysisSource(searchParams.get("source"));
  const [analysisMode, setAnalysisMode] = useState<QuickAnalysisMode | "">("");
  const [division, setDivision] = useState<QuickAnalysisDivision | "">("");
  const [competitionStatus, setCompetitionStatus] = useState<QuickAnalysisCompetitionStatus>("preparing");
  const [weeksOut, setWeeksOut] = useState("12");
  const [optionalContext, setOptionalContext] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [aiConsentConfirmed, setAiConsentConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});

  useEffect(() => {
    trackEvent("quick_analysis_view", { product: "StageLab Quick Analysis", source });
  }, [source]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedWeeks = analysisMode === "competition_prep" && competitionStatus === "preparing" ? Number(weeksOut) : null;
    const nextFieldErrors: CheckoutFieldErrors = {};
    if (!analysisMode) nextFieldErrors.analysisMode = "Choose Competition Prep or Physique Check.";
    if (!division) nextFieldErrors.division = "Select a division or comparison standard.";
    if (analysisMode === "competition_prep" && competitionStatus === "preparing" && (!Number.isInteger(parsedWeeks) || parsedWeeks! < 0 || parsedWeeks! > 60)) {
      nextFieldErrors.weeksOut = "Enter a whole number from 0 to 60.";
    }
    if (!ageConfirmed) nextFieldErrors.ageConfirmed = "Confirm that you are at least 18 years old.";
    if (!aiConsentConfirmed) nextFieldErrors.aiConsentConfirmed = "Confirm AI processing before continuing.";
    setFieldErrors(nextFieldErrors);

    const firstInvalidField = Object.keys(nextFieldErrors)[0] as CheckoutField | undefined;
    if (firstInvalidField) {
      setError("Review the highlighted fields below.");
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-quick-analysis-field="${firstInvalidField}"] input, [data-quick-analysis-field="${firstInvalidField}"] select`)?.focus());
      return;
    }

    setSubmitting(true);
    trackEvent("quick_analysis_checkout_started", {
      product: "StageLab Quick Analysis",
      value: QUICK_ANALYSIS_PRICE_VALUE,
      currency: "USD",
      analysis_mode: analysisMode,
      source,
    });

    try {
      const response = await fetch("/api/quick-analysis/checkout/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisMode,
          division,
          competitionStatus: analysisMode === "physique_check" ? "assessing" : competitionStatus,
          weeksOut: parsedWeeks,
          optionalContext: optionalContext.trim() || null,
          ageConfirmed,
          aiConsentConfirmed,
          source,
        }),
      });
      const payload = (await response.json()) as CheckoutResponse;
      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error || "Checkout could not be started. Please try again.");
      }
      window.location.assign(payload.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be started.");
      setSubmitting(false);
    }
  }

  const paymentNotice = searchParams.get("cancelled") === "1"
    ? "Checkout was canceled. You have not been charged."
    : searchParams.has("payment")
      ? "We could not verify that payment. If you were charged, contact support so we can help."
      : null;

  return (
    <form className="quick-analysis-form panel" onSubmit={handleSubmit} noValidate>
      <div className="quick-analysis-form-head">
        <div>
          <div className="eyebrow">Your snapshot</div>
          <h2>Set the context for your analysis.</h2>
        </div>
        <div className="quick-analysis-price" aria-label={`${formatQuickAnalysisPrice()} one time`}>
          <strong>{formatQuickAnalysisPrice()}</strong>
          <span>one time</span>
        </div>
      </div>

      {paymentNotice ? <p className="form-feedback is-error" role="status">{paymentNotice}</p> : null}

      <fieldset className="quick-analysis-mode-selector" data-quick-analysis-field="analysisMode" aria-describedby={fieldErrors.analysisMode ? "quick-analysis-mode-error" : undefined}>
        <legend className="field-label">What do you want to assess?</legend>
        <div className="quick-analysis-mode-grid">
          <label className={`quick-analysis-mode-card${analysisMode === "competition_prep" ? " is-selected" : ""}`}>
            <input
              type="radio"
              name="analysisMode"
              value="competition_prep"
              checked={analysisMode === "competition_prep"}
              onChange={() => { setAnalysisMode("competition_prep"); setCompetitionStatus("preparing"); setFieldErrors((current) => ({ ...current, analysisMode: undefined })); }}
              required
            />
            <span><strong>Competition Prep</strong><small>I&apos;m preparing for a bodybuilding or physique competition.</small></span>
          </label>
          <label className={`quick-analysis-mode-card${analysisMode === "physique_check" ? " is-selected" : ""}`}>
            <input
              type="radio"
              name="analysisMode"
              value="physique_check"
              checked={analysisMode === "physique_check"}
              onChange={() => { setAnalysisMode("physique_check"); setCompetitionStatus("assessing"); setFieldErrors((current) => ({ ...current, analysisMode: undefined })); }}
              required
            />
            <span><strong>Physique Check</strong><small>I&apos;m not currently competing. I want to compare my physique with competition-level conditioning.</small></span>
          </label>
        </div>
        {fieldErrors.analysisMode ? <p className="field-error" id="quick-analysis-mode-error">{fieldErrors.analysisMode}</p> : null}
      </fieldset>

      <div className="field-grid">
        <label className="field" data-quick-analysis-field="division">
          <span className="field-label">{analysisMode === "physique_check" ? "Comparison standard" : analysisMode === "competition_prep" ? "Competition division" : "Division or comparison standard"}</span>
          <select value={division} onChange={(event) => { setDivision(event.target.value as QuickAnalysisDivision | ""); setFieldErrors((current) => ({ ...current, division: undefined })); }} aria-invalid={Boolean(fieldErrors.division)} aria-describedby={fieldErrors.division ? "quick-analysis-division-error" : undefined} required>
            <option value="">Select a division</option>
            {QUICK_ANALYSIS_DIVISIONS.map((option) => <option value={option} key={option}>{option}</option>)}
          </select>
          {fieldErrors.division ? <span className="field-error" id="quick-analysis-division-error">{fieldErrors.division}</span> : null}
        </label>

        {analysisMode === "competition_prep" ? (
          <label className="field">
            <span className="field-label">Are you preparing for a competition?</span>
            <select
              value={competitionStatus}
              onChange={(event) => setCompetitionStatus(event.target.value as QuickAnalysisCompetitionStatus)}
            >
              <option value="preparing">Yes</option>
              <option value="assessing">No / snapshot assessment only</option>
            </select>
          </label>
        ) : null}

        {analysisMode === "competition_prep" && competitionStatus === "preparing" ? (
          <label className="field" data-quick-analysis-field="weeksOut">
            <span className="field-label">Weeks out</span>
            <input type="number" min="0" max="60" step="1" inputMode="numeric" value={weeksOut} onChange={(event) => { setWeeksOut(event.target.value); setFieldErrors((current) => ({ ...current, weeksOut: undefined })); }} aria-invalid={Boolean(fieldErrors.weeksOut)} aria-describedby={fieldErrors.weeksOut ? "quick-analysis-weeks-error" : undefined} required />
            {fieldErrors.weeksOut ? <span className="field-error" id="quick-analysis-weeks-error">{fieldErrors.weeksOut}</span> : null}
          </label>
        ) : null}

        <label className="field field-full">
          <span className="field-label">Anything you&apos;d like StageLab to consider? <span className="field-optional">Optional</span></span>
          <textarea
            maxLength={QUICK_ANALYSIS_MAX_CONTEXT_LENGTH}
            value={optionalContext}
            onChange={(event) => setOptionalContext(event.target.value)}
            placeholder={analysisMode === "physique_check" ? "Brief posing or physique context only. Do not include medical history." : "Brief posing or timeline context only. Do not include medical history."}
          />
          <span className="field-help">Used only for this analysis and removed when your 72-hour result expires. {optionalContext.length}/{QUICK_ANALYSIS_MAX_CONTEXT_LENGTH} characters</span>
        </label>
      </div>

      <div className="quick-analysis-consents">
        <label className="quick-analysis-check" data-quick-analysis-field="ageConfirmed">
          <input type="checkbox" checked={ageConfirmed} onChange={(event) => { setAgeConfirmed(event.target.checked); setFieldErrors((current) => ({ ...current, ageConfirmed: undefined })); }} aria-invalid={Boolean(fieldErrors.ageConfirmed)} aria-describedby={fieldErrors.ageConfirmed ? "quick-analysis-age-error" : undefined} />
          <span>I confirm that I am at least 18 years old.</span>
        </label>
        {fieldErrors.ageConfirmed ? <p className="field-error" id="quick-analysis-age-error">{fieldErrors.ageConfirmed}</p> : null}
        <label className="quick-analysis-check" data-quick-analysis-field="aiConsentConfirmed">
          <input type="checkbox" checked={aiConsentConfirmed} onChange={(event) => { setAiConsentConfirmed(event.target.checked); setFieldErrors((current) => ({ ...current, aiConsentConfirmed: undefined })); }} aria-invalid={Boolean(fieldErrors.aiConsentConfirmed)} aria-describedby={fieldErrors.aiConsentConfirmed ? "quick-analysis-ai-error" : undefined} />
          <span>
            I understand that my photos and optional context will be used only to generate this one-time analysis. ElevareFit never stores the photos; they are discarded after AI processing. My optional context and structured report are removed after 72 hours. See the <a href="/privacy-policy/">Privacy Policy</a>.
          </span>
        </label>
        {fieldErrors.aiConsentConfirmed ? <p className="field-error" id="quick-analysis-ai-error">{fieldErrors.aiConsentConfirmed}</p> : null}
      </div>

      <div className="form-actions">
        <button className="button button-primary quick-analysis-pay-button" type="submit" disabled={submitting}>
          {submitting ? "Opening secure checkout..." : `Get My Quick Analysis — ${formatQuickAnalysisPrice()}`}
        </button>
        <p className="fine-print">
          No subscription, automatic renewal, StageLab app credit, or mobile entitlement. By continuing, you agree to the <a href="/terms-of-service/">Terms of Service</a>.
        </p>
        {error ? <p className="form-feedback is-error" role="alert">{error}</p> : null}
      </div>
    </form>
  );
}
