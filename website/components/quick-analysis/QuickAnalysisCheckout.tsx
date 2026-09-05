"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/config";
import type { QuickAnalysisMessages } from "@/lib/i18n/quick-analysis-types";
import { normalizeQuickAnalysisSource } from "@/lib/quick-analysis-attribution";
import { markQuickAnalysisRecoveryCandidate } from "@/lib/quick-analysis-recovery-marker";
import {
  QUICK_ANALYSIS_DIVISIONS,
  QUICK_ANALYSIS_MAX_CONTEXT_LENGTH,
  QUICK_ANALYSIS_PRICE_VALUE,
  formatQuickAnalysisPrice,
  type QuickAnalysisCompetitionStatus,
  type QuickAnalysisDivision,
  type QuickAnalysisMode,
} from "@/lib/quick-analysis";

type CheckoutResponse = { clientSecret?: string; checkoutSessionId?: string; generationLocale?: Locale; error?: string; code?: string };
type CheckoutField = "analysisMode" | "division" | "weeksOut" | "ageConfirmed" | "aiConsentConfirmed";
type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function localizeError(messages: QuickAnalysisMessages["checkout"], code: string | undefined) {
  return (code && messages.errors[code]) || messages.checkoutFailed;
}

function QuickAnalysisEmbeddedPayment({
  checkoutSessionId,
  clientSecret,
  source,
  locale,
  generationLocale,
  messages,
  onCancel,
}: {
  checkoutSessionId: string;
  clientSecret: string;
  source: string | null | undefined;
  locale: Locale;
  generationLocale: Locale;
  messages: QuickAnalysisMessages["checkout"];
  onCancel: () => void;
}) {
  const handleComplete = useCallback(() => {
    const sourceSuffix = source ? `&source=${encodeURIComponent(source)}` : "";
    window.location.assign(`/stagelab/quick-analysis/return/?session_id=${encodeURIComponent(checkoutSessionId)}${sourceSuffix}&locale=${encodeURIComponent(locale)}`);
  }, [checkoutSessionId, locale, source]);
  const options = useMemo(() => ({ clientSecret, onComplete: handleComplete }), [clientSecret, handleComplete]);

  return (
    <section className="quick-analysis-form quick-analysis-embedded-payment panel" aria-labelledby="quick-analysis-payment-title">
      <div className="quick-analysis-form-head">
        <div>
          <div className="eyebrow">{messages.securePayment}</div>
          <h2 id="quick-analysis-payment-title">{messages.completePurchase}</h2>
        </div>
        <div className="quick-analysis-price" aria-label={`${formatQuickAnalysisPrice()} ${messages.oneTime}`}>
          <strong>{formatQuickAnalysisPrice()}</strong>
          <span>{messages.oneTime}</span>
        </div>
      </div>
      <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
        <EmbeddedCheckout className="quick-analysis-embedded-checkout" />
      </EmbeddedCheckoutProvider>
      {generationLocale !== locale ? <p className="fine-print" role="status">{messages.reportLanguageFallback}</p> : null}
      <button className="button button-secondary quick-analysis-payment-back" type="button" onClick={onCancel}>
        {messages.backToDetails}
      </button>
    </section>
  );
}

export function QuickAnalysisCheckout({ locale, messages }: { locale: Locale; messages: QuickAnalysisMessages["checkout"] }) {
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
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [generationLocale, setGenerationLocale] = useState<Locale>("en");
  const [checkoutCancelled, setCheckoutCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackEvent("quick_analysis_view", { product: "StageLab Quick Analysis", source });
  }, [source]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedWeeks = analysisMode === "competition_prep" && competitionStatus === "preparing" ? Number(weeksOut) : null;
    const nextFieldErrors: CheckoutFieldErrors = {};
    if (!analysisMode) nextFieldErrors.analysisMode = messages.validation.mode;
    if (!division) nextFieldErrors.division = messages.validation.division;
    if (analysisMode === "competition_prep" && competitionStatus === "preparing" && (!Number.isInteger(parsedWeeks) || parsedWeeks! < 0 || parsedWeeks! > 60)) {
      nextFieldErrors.weeksOut = messages.validation.weeks;
    }
    if (!ageConfirmed) nextFieldErrors.ageConfirmed = messages.validation.age;
    if (!aiConsentConfirmed) nextFieldErrors.aiConsentConfirmed = messages.validation.ai;
    setFieldErrors(nextFieldErrors);

    const firstInvalidField = Object.keys(nextFieldErrors)[0] as CheckoutField | undefined;
    if (firstInvalidField) {
      setError(messages.validation.review);
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-quick-analysis-field="${firstInvalidField}"] input, [data-quick-analysis-field="${firstInvalidField}"] select`)?.focus());
      return;
    }

    if (!stripePromise) {
      setError(messages.paymentUnavailable);
      return;
    }

    setCheckoutCancelled(false);
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
          locale,
        }),
      });
      const payload = (await response.json()) as CheckoutResponse;
      if (!response.ok || !payload.clientSecret || !payload.checkoutSessionId) {
        throw new Error(localizeError(messages, payload.code));
      }
      markQuickAnalysisRecoveryCandidate();
      setClientSecret(payload.clientSecret);
      setCheckoutSessionId(payload.checkoutSessionId);
      setGenerationLocale(payload.generationLocale ?? "en");
      setSubmitting(false);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : messages.checkoutFailed);
      setSubmitting(false);
    }
  }

  const paymentNotice = checkoutCancelled || searchParams.get("cancelled") === "1"
    ? messages.paymentCancelled
    : searchParams.has("payment")
      ? messages.paymentVerificationFailed
      : null;

  if (clientSecret && checkoutSessionId) {
    return (
      <QuickAnalysisEmbeddedPayment
        checkoutSessionId={checkoutSessionId}
        clientSecret={clientSecret}
        source={source}
        locale={locale}
        generationLocale={generationLocale}
        messages={messages}
        onCancel={() => {
          setClientSecret(null);
          setCheckoutSessionId(null);
          setCheckoutCancelled(true);
          setSubmitting(false);
        }}
      />
    );
  }

  return (
    <form className="quick-analysis-form panel" onSubmit={handleSubmit} noValidate>
      <div className="quick-analysis-form-head">
        <div>
          <div className="eyebrow">{messages.snapshot}</div>
          <h2>{messages.setContext}</h2>
        </div>
        <div className="quick-analysis-price" aria-label={`${formatQuickAnalysisPrice()} ${messages.oneTime}`}>
          <strong>{formatQuickAnalysisPrice()}</strong>
          <span>{messages.oneTime}</span>
        </div>
      </div>

      {paymentNotice ? <p className="form-feedback is-error" role="status">{paymentNotice}</p> : null}

      <fieldset className="quick-analysis-mode-selector" data-quick-analysis-field="analysisMode" aria-describedby={fieldErrors.analysisMode ? "quick-analysis-mode-error" : undefined}>
        <legend className="field-label">{messages.assessQuestion}</legend>
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
            <span><strong>{messages.competitionPrep}</strong><small>{messages.competitionPrepDescription}</small></span>
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
            <span><strong>{messages.physiqueCheck}</strong><small>{messages.physiqueCheckDescription}</small></span>
          </label>
        </div>
        {fieldErrors.analysisMode ? <p className="field-error" id="quick-analysis-mode-error">{fieldErrors.analysisMode}</p> : null}
      </fieldset>

      <div className="field-grid">
        <label className="field" data-quick-analysis-field="division">
          <span className="field-label">{analysisMode === "physique_check" ? messages.comparisonStandard : analysisMode === "competition_prep" ? messages.competitionDivision : messages.divisionOrStandard}</span>
          <select value={division} onChange={(event) => { setDivision(event.target.value as QuickAnalysisDivision | ""); setFieldErrors((current) => ({ ...current, division: undefined })); }} aria-invalid={Boolean(fieldErrors.division)} aria-describedby={fieldErrors.division ? "quick-analysis-division-error" : undefined} required>
            <option value="">{messages.selectDivision}</option>
            {QUICK_ANALYSIS_DIVISIONS.map((option) => <option value={option} key={option}>{option}</option>)}
          </select>
          {fieldErrors.division ? <span className="field-error" id="quick-analysis-division-error">{fieldErrors.division}</span> : null}
        </label>

        {analysisMode === "competition_prep" ? (
          <label className="field">
            <span className="field-label">{messages.preparingQuestion}</span>
            <select
              value={competitionStatus}
              onChange={(event) => setCompetitionStatus(event.target.value as QuickAnalysisCompetitionStatus)}
            >
              <option value="preparing">{messages.yes}</option>
              <option value="assessing">{messages.snapshotOnly}</option>
            </select>
          </label>
        ) : null}

        {analysisMode === "competition_prep" && competitionStatus === "preparing" ? (
          <label className="field" data-quick-analysis-field="weeksOut">
            <span className="field-label">{messages.weeksOut}</span>
            <input type="number" min="0" max="60" step="1" inputMode="numeric" value={weeksOut} onChange={(event) => { setWeeksOut(event.target.value); setFieldErrors((current) => ({ ...current, weeksOut: undefined })); }} aria-invalid={Boolean(fieldErrors.weeksOut)} aria-describedby={fieldErrors.weeksOut ? "quick-analysis-weeks-error" : undefined} required />
            {fieldErrors.weeksOut ? <span className="field-error" id="quick-analysis-weeks-error">{fieldErrors.weeksOut}</span> : null}
          </label>
        ) : null}

        <label className="field field-full">
          <span className="field-label">{messages.optionalContextLabel} <span className="field-optional">{messages.optional}</span></span>
          <textarea
            maxLength={QUICK_ANALYSIS_MAX_CONTEXT_LENGTH}
            value={optionalContext}
            onChange={(event) => setOptionalContext(event.target.value)}
            placeholder={analysisMode === "physique_check" ? messages.physiqueContextPlaceholder : messages.prepContextPlaceholder}
          />
          <span className="field-help">{messages.contextRetention} {optionalContext.length}/{QUICK_ANALYSIS_MAX_CONTEXT_LENGTH} {messages.characters}</span>
        </label>
      </div>

      <div className="quick-analysis-consents">
        <label className="quick-analysis-check" data-quick-analysis-field="ageConfirmed">
          <input type="checkbox" checked={ageConfirmed} onChange={(event) => { setAgeConfirmed(event.target.checked); setFieldErrors((current) => ({ ...current, ageConfirmed: undefined })); }} aria-invalid={Boolean(fieldErrors.ageConfirmed)} aria-describedby={fieldErrors.ageConfirmed ? "quick-analysis-age-error" : undefined} />
          <span>{messages.ageConsent}</span>
        </label>
        {fieldErrors.ageConfirmed ? <p className="field-error" id="quick-analysis-age-error">{fieldErrors.ageConfirmed}</p> : null}
        <label className="quick-analysis-check" data-quick-analysis-field="aiConsentConfirmed">
          <input type="checkbox" checked={aiConsentConfirmed} onChange={(event) => { setAiConsentConfirmed(event.target.checked); setFieldErrors((current) => ({ ...current, aiConsentConfirmed: undefined })); }} aria-invalid={Boolean(fieldErrors.aiConsentConfirmed)} aria-describedby={fieldErrors.aiConsentConfirmed ? "quick-analysis-ai-error" : undefined} />
          <span>
            {messages.aiConsentBefore}<a href="/privacy-policy/" hrefLang="en">{messages.privacyPolicy}</a>{messages.aiConsentAfter}
          </span>
        </label>
        {fieldErrors.aiConsentConfirmed ? <p className="field-error" id="quick-analysis-ai-error">{fieldErrors.aiConsentConfirmed}</p> : null}
      </div>

      <div className="form-actions">
        <button className="button button-primary quick-analysis-pay-button" type="submit" disabled={submitting}>
          {submitting ? messages.loadingPayment : `${messages.purchaseButton} — ${formatQuickAnalysisPrice()}`}
        </button>
        <p className="fine-print">
          {messages.purchaseTermsBefore}<a href="/terms-of-service/" hrefLang="en">{messages.termsOfService}</a>.
        </p>
        {error ? <p className="form-feedback is-error" role="alert">{error}</p> : null}
      </div>
    </form>
  );
}
