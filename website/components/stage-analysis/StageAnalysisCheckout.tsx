"use client";

import { PosingRequestError } from "@/lib/posing-request-error";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { analysisDiscoveryCopy } from "@/lib/stage-analysis-discovery";
import { trackEvent } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/config";
import type { StageAnalysisMessages } from "@/lib/i18n/stage-analysis-messages";
import { normalizeQuickAnalysisSource } from "@/lib/quick-analysis-attribution";
import {
  POSING_DIVISIONS,
  STAGE_ANALYSIS_PRODUCT_CONFIG,
  formatStageAnalysisPrice,
  type PaidStageAnalysisProduct,
  type PosingDivision,
} from "@/lib/stage-analysis";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const divisionLabels: Record<Locale, Partial<Record<PosingDivision, string>>> = {
  en: {},
  "es-419": { "Men's Physique": "Físico masculino", "Classic Physique": "Físico clásico", Bodybuilding: "Fisicoculturismo", Bikini: "Bikini", Wellness: "Wellness", Figure: "Figura" },
  "pt-BR": { "Men's Physique": "Men's Physique", "Classic Physique": "Classic Physique", Bodybuilding: "Fisiculturismo", Bikini: "Bikini", Wellness: "Wellness", Figure: "Figure" },
};

type CheckoutResponse = {
  clientSecret?: string;
  checkoutSessionId?: string;
  generationLocale?: Locale;
  error?: string;
  code?: string;
};

export function StageAnalysisCheckout({
  product,
  locale,
  messages,
}: {
  product: PaidStageAnalysisProduct;
  locale: Locale;
  messages: StageAnalysisMessages["checkout"];
}) {
  const searchParams = useSearchParams();
  const source = normalizeQuickAnalysisSource(searchParams.get("source"));
  const [division, setDivision] = useState<PosingDivision | "">("");
  const [competitionStatus, setCompetitionStatus] = useState<"preparing" | "assessing">("preparing");
  const [weeksOut, setWeeksOut] = useState("12");
  const [optionalContext, setOptionalContext] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [aiConsentConfirmed, setAiConsentConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const isComplete = product === "complete_stage_analysis";
  const route = isComplete ? "complete-stage-analysis" : "posing-analysis";

  const handleComplete = useCallback(() => {
    if (!checkoutSessionId) return;
    const sourceSuffix = source ? `&source=${encodeURIComponent(source)}` : "";
    window.location.assign(`/stagelab/${route}/return/?session_id=${encodeURIComponent(checkoutSessionId)}${sourceSuffix}&locale=${encodeURIComponent(locale)}`);
  }, [checkoutSessionId, locale, route, source]);
  const embeddedOptions = useMemo(
    () => clientSecret ? { clientSecret, onComplete: handleComplete } : null,
    [clientSecret, handleComplete],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedWeeks = isComplete && competitionStatus === "preparing" ? Number(weeksOut) : null;
    if (!division || !ageConfirmed || !aiConsentConfirmed || (parsedWeeks != null && (!Number.isInteger(parsedWeeks) || parsedWeeks < 0 || parsedWeeks > 60))) {
      setError(messages.validation);
      return;
    }
    if (!stripePromise) {
      setError(messages.unavailable);
      return;
    }
    setSubmitting(true);
    try { trackEvent(isComplete ? "complete_stage_checkout_started" : "posing_checkout_started", {
      product,
      value: STAGE_ANALYSIS_PRODUCT_CONFIG[product].priceCents / 100,
      currency: "USD",
      source,
    }); } catch { /* Optional analytics must not prevent checkout. */ }
    try {
      const response = await fetch("/api/stage-analysis/checkout/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-StageLab-Locale": locale },
        body: JSON.stringify({
          product,
          division,
          competitionStatus: isComplete ? competitionStatus : "assessing",
          weeksOut: parsedWeeks,
          optionalContext: optionalContext.trim() || null,
          ageConfirmed,
          aiConsentConfirmed,
          source,
          locale,
        }),
      });
      const payload = await response.json().catch(() => ({})) as CheckoutResponse;
      if (!response.ok || !payload.clientSecret || !payload.checkoutSessionId) {
        throw new PosingRequestError(payload.code, locale);
      }
      setClientSecret(payload.clientSecret);
      setCheckoutSessionId(payload.checkoutSessionId);
    } catch (checkoutError) {
      setError(checkoutError instanceof PosingRequestError ? checkoutError.message : messages.failed);
    } finally {
      setSubmitting(false);
    }
  }

  if (embeddedOptions && checkoutSessionId) {
    return (
      <section className="quick-analysis-form quick-analysis-embedded-payment panel" aria-labelledby="stage-analysis-payment-title">
        <div className="quick-analysis-form-head"><div><div className="eyebrow">{messages.securePayment}</div><h2 id="stage-analysis-payment-title">{messages.completePurchase}</h2></div><div className="quick-analysis-price"><strong>{formatStageAnalysisPrice(product)}</strong></div></div>
        <EmbeddedCheckoutProvider stripe={stripePromise} options={embeddedOptions}><EmbeddedCheckout className="quick-analysis-embedded-checkout" /></EmbeddedCheckoutProvider>
        <button className="button button-secondary quick-analysis-payment-back" type="button" onClick={() => { setClientSecret(null); setCheckoutSessionId(null); }}>{messages.back}</button>
      </section>
    );
  }

  const paymentNotice = searchParams.has("payment") ? messages.cancelled : null;
  return (
    <form className="quick-analysis-form panel" onSubmit={handleSubmit} noValidate>
      <div className="quick-analysis-form-head"><div><div className="eyebrow">{messages.details}</div><h2>{analysisDiscoveryCopy[locale].products[product].title}</h2></div><div className="quick-analysis-price"><strong>{formatStageAnalysisPrice(product)}</strong></div></div>
      {paymentNotice ? <p className="form-feedback is-error" role="status">{paymentNotice}</p> : null}
      <div className="field-grid">
        <label className="field"><span className="field-label">{messages.division}</span><select value={division} onChange={(event) => setDivision(event.target.value as PosingDivision)} required><option value="">{messages.selectDivision}</option>{POSING_DIVISIONS.map((item) => <option key={item} value={item}>{divisionLabels[locale][item] ?? item}</option>)}</select></label>
        {isComplete ? <label className="field"><span className="field-label">{messages.preparing}</span><select value={competitionStatus} onChange={(event) => setCompetitionStatus(event.target.value as "preparing" | "assessing")}><option value="preparing">{messages.yes}</option><option value="assessing">{messages.snapshotOnly}</option></select></label> : null}
        {isComplete && competitionStatus === "preparing" ? <label className="field"><span className="field-label">{messages.weeksOut}</span><input type="number" min="0" max="60" step="1" inputMode="numeric" value={weeksOut} onChange={(event) => setWeeksOut(event.target.value)} required /></label> : null}
        <label className="field field-full"><span className="field-label">{messages.context} <span className="field-optional">{messages.optional}</span></span><textarea maxLength={400} value={optionalContext} onChange={(event) => setOptionalContext(event.target.value)} placeholder={messages.contextPlaceholder} /></label>
      </div>
      <div className="quick-analysis-consents">
        <label className="quick-analysis-check"><input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} /><span>{messages.age}</span></label>
        <label className="quick-analysis-check"><input type="checkbox" checked={aiConsentConfirmed} onChange={(event) => setAiConsentConfirmed(event.target.checked)} /><span>{messages.ai}</span></label>
      </div>
      <div className="form-actions">
        <button className="button button-primary quick-analysis-pay-button" type="submit" disabled={submitting || !stripePromise}>{submitting ? messages.loading : `${messages.purchase} — ${formatStageAnalysisPrice(product)}`}</button>
        {!stripePromise ? <p className="fine-print" role="status">{messages.unavailable}</p> : null}
        <p className="fine-print">{messages.termsBefore} <Link href="/terms-of-service/">{messages.terms}</Link>.</p>
        {error ? <p className="form-feedback is-error" role="alert">{error}</p> : null}
      </div>
    </form>
  );
}
