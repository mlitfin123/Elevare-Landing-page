"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { trackEvent } from "@/lib/analytics";
import { localeFromPathname, localizePathname } from "@/lib/i18n/config";
import { localizeMarketplaceCategory, marketplaceText } from "@/lib/i18n/marketplace-content";
import { parseBudgetInput } from "@/lib/marketplace-account";
import type { ProfessionalDirectoryFilters } from "@/lib/marketplace-helpers";
import type { ProfessionalCategoryRecord } from "@/lib/marketplace-types";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type MarketplaceDemandFormProps = {
  categories: ProfessionalCategoryRecord[];
  filters: ProfessionalDirectoryFilters;
  fixedCategorySlug?: string;
  sourcePage: string;
  exactResultCount: number;
  fallbackResultCount: number;
};

type ConciergeDraft = {
  requestKey: string;
  primaryGoal: string;
  supportType: string;
  category: string;
  specialty: string;
  locationLabel: string;
  serviceMode: string;
  radius: string;
  budget: string;
  startTimeframe: string;
  availability: string;
  experience: string;
  languages: string[];
  languageRequired: boolean;
  preferences: string[];
  note: string;
};

const GOALS = ["Fat loss", "Build muscle", "Improve strength", "General fitness", "Competition preparation", "Nutrition support", "Mobility and recovery", "Other"];
const SUPPORT_TYPES = ["One-on-one coaching", "Nutrition guidance", "Training program", "Group or class support", "Bodywork or recovery", "General professional guidance"];
const LANGUAGES = ["English", "Spanish", "Portuguese", "French", "German", "Italian", "Mandarin", "Other"];
const PREFERENCES = ["Evening availability", "Weekend availability", "Virtual check-ins", "In-person sessions"];

function createRequestKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `request-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function blankDraft(category: string, specialty: string, location: string, serviceMode: string, note: string): ConciergeDraft {
  return {
    requestKey: "", primaryGoal: "", supportType: "", category, specialty,
    locationLabel: location, serviceMode, radius: "", budget: "", startTimeframe: "",
    availability: "", experience: "", languages: [], languageRequired: false,
    preferences: [], note,
  };
}

export function MarketplaceDemandForm({ categories, filters, fixedCategorySlug, sourcePage }: MarketplaceDemandFormProps) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const t = (value: string) => marketplaceText(locale, value);
  const { user, isConfigured } = useSupabaseSession();
  const storageKey = `elevare.concierge-draft.${locale}`;
  const initialCategory = fixedCategorySlug ?? (filters.category !== "all" ? filters.category : "");
  const initialSpecialty = filters.specialty !== "all" ? filters.specialty : "";
  const initialLocation = filters.location !== "all" ? filters.location : "";
  const initialMode = filters.serviceMode !== "all" ? filters.serviceMode : "";
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ConciergeDraft>(() => blankDraft(initialCategory, initialSpecialty, initialLocation, initialMode, filters.query.trim()));
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [caseCode, setCaseCode] = useState<string | null>(null);

  const categoryOptions = useMemo(() => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)), [categories]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        const restored = saved ? JSON.parse(saved) as Partial<ConciergeDraft> : {};
        setDraft({
          ...blankDraft(initialCategory, initialSpecialty, initialLocation, initialMode, filters.query.trim()),
          ...restored,
          requestKey: restored.requestKey || createRequestKey(),
        });
      } catch {
        window.localStorage.removeItem(storageKey);
      }
      setHasRestoredDraft(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [filters.query, initialCategory, initialLocation, initialMode, initialSpecialty, storageKey]);

  useEffect(() => {
    if (!hasRestoredDraft || caseCode) return;
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [caseCode, draft, hasRestoredDraft, storageKey]);

  function update<K extends keyof ConciergeDraft>(key: K, value: ConciergeDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleList(key: "languages" | "preferences", value: string) {
    update(key, draft[key].includes(value) ? draft[key].filter((item) => item !== value) : [...draft[key], value]);
  }

  function openForm() {
    setIsOpen(true);
    setFeedback(null);
    trackEvent("concierge_flow_started", { source_page: sourcePage });
  }

  function continueToDetails() {
    if (!draft.primaryGoal || !draft.supportType) {
      setFeedback({ type: "error", message: t("Choose a primary goal and type of support to continue.") });
      return;
    }
    setFeedback(null);
    setStep(2);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!isConfigured || !supabase) {
      setFeedback({ type: "error", message: t("Marketplace account tools are not configured yet.") });
      return;
    }
    if (!user) {
      setFeedback({ type: "error", message: t("Sign in or create an account to submit and manage this request.") });
      return;
    }
    if (!consent) {
      setFeedback({ type: "error", message: t("Confirm what may be shared with selected professionals.") });
      return;
    }
    if ((draft.serviceMode === "in_person" || draft.serviceMode === "hybrid") && !draft.locationLabel.trim()) {
      setFeedback({ type: "error", message: t("Add a city, ZIP code, or general location for in-person support.") });
      return;
    }
    const radius = Number.parseInt(draft.radius, 10);
    const { budgetMinCents, budgetMaxCents } = parseBudgetInput(draft.budget);
    setIsSubmitting(true);
    setFeedback(null);
    const { data, error } = await supabase.rpc("marketplace_submit_concierge_request", {
      p_request_key: draft.requestKey,
      p_primary_goal: draft.primaryGoal,
      p_support_type: draft.supportType,
      p_category_slug: (fixedCategorySlug ?? draft.category) || null,
      p_specialty: draft.specialty.trim() || null,
      p_service_mode: draft.serviceMode || null,
      p_location_label: draft.locationLabel.trim() || null,
      p_travel_radius_miles: Number.isFinite(radius) ? radius : null,
      p_budget_min_cents: budgetMinCents,
      p_budget_max_cents: budgetMaxCents,
      p_start_timeframe: draft.startTimeframe || null,
      p_general_availability: draft.availability.trim() || null,
      p_experience_level: draft.experience || null,
      p_preferred_languages: draft.languages,
      p_language_required: draft.languageRequired,
      p_service_preferences: draft.preferences,
      p_note: draft.note.trim() || null,
      p_share_consent: true,
      p_locale: locale,
      p_source_page: sourcePage,
    });
    if (error) {
      setFeedback({ type: "error", message: t("We could not submit your request right now. Please review the form and try again.") });
    } else {
      const result = data as { case_code?: string } | null;
      setCaseCode(result?.case_code ?? null);
      window.localStorage.removeItem(storageKey);
      setFeedback({ type: "success", message: t("Your request is in. Elevare will review it and your status will be available in your account.") });
      trackEvent("concierge_match_request_submitted", {
        source_page: sourcePage,
        service_mode: draft.serviceMode || "unspecified",
        category_selected: Boolean(fixedCategorySlug ?? draft.category),
        language_required: draft.languageRequired,
      });
      trackEvent("concierge_match_request_confirmation_viewed", { source_page: sourcePage });
    }
    setIsSubmitting(false);
  }

  if (caseCode) return <div id="concierge-request" className="concierge-confirmation panel" role="status" aria-live="polite"><span className="meta-pill">{t("Request received")}</span><h3>{t("We will review your request.")}</h3><p>{t("If suitable professionals are available, we may first confirm their interest and then share a short list with you. This is not a booking and a match is not guaranteed.")}</p><p className="field-help">{t("Reference")}: {caseCode}</p><Link className="button button-primary" href={localizePathname("/account/matches/", locale)}>{t("View my match requests")}</Link></div>;

  return <div id="concierge-request" className="marketplace-action-stack concierge-entry">
    {!isOpen ? <><button type="button" className="button button-primary" onClick={openForm}>{t("Help me find the right professional")}</button><p className="form-note">{t("Tell us what you need and Elevare may identify a short list of suitable, available professionals.")}</p></> : null}
    {isOpen ? <form className="marketplace-inline-form concierge-form" onSubmit={handleSubmit} noValidate>
      <div className="concierge-progress" aria-label={t("Request progress")}><span className={step === 1 ? "is-active" : "is-complete"}>{t("1. What you need")}</span><span className={step === 2 ? "is-active" : ""}>{t("2. Preferences")}</span></div>
      {step === 1 ? <div className="field-grid">
        <label className="field"><span className="field-label">{t("Primary goal")}</span><select value={draft.primaryGoal} onChange={(event) => update("primaryGoal", event.target.value)} required><option value="">{t("Select a goal")}</option>{GOALS.map((value) => <option key={value} value={value.toLowerCase().replaceAll(" ", "_")}>{t(value)}</option>)}</select></label>
        <label className="field"><span className="field-label">{t("Type of support")}</span><select value={draft.supportType} onChange={(event) => update("supportType", event.target.value)} required><option value="">{t("Select support")}</option>{SUPPORT_TYPES.map((value) => <option key={value} value={value.toLowerCase().replaceAll(/[- ]/g, "_")}>{t(value)}</option>)}</select></label>
        {!fixedCategorySlug ? <label className="field"><span className="field-label">{t("Professional category (optional)")}</span><select value={draft.category} onChange={(event) => update("category", event.target.value)}><option value="">{t("Not sure yet")}</option>{categoryOptions.map((option) => <option key={option.slug} value={option.slug}>{localizeMarketplaceCategory(option, locale).label}</option>)}</select></label> : null}
        <label className="field"><span className="field-label">{t("Preferred service mode")}</span><select value={draft.serviceMode} onChange={(event) => update("serviceMode", event.target.value)}><option value="">{t("Either online or in person")}</option><option value="online">{t("Online")}</option><option value="in_person">{t("In person")}</option><option value="hybrid">{t("Hybrid")}</option></select></label>
        <label className="field"><span className="field-label">{t("Specialty (optional)")}</span><input value={draft.specialty} maxLength={120} onChange={(event) => update("specialty", event.target.value)} placeholder={t("Competition prep, strength, mobility...")} /></label>
        <label className="field"><span className="field-label">{t("City, ZIP code, or general location")}</span><input value={draft.locationLabel} maxLength={160} onChange={(event) => update("locationLabel", event.target.value)} placeholder={t("Miami, FL or 33101")} /></label>
        {(draft.serviceMode === "in_person" || draft.serviceMode === "hybrid") ? <label className="field"><span className="field-label">{t("Acceptable travel radius")}</span><select value={draft.radius} onChange={(event) => update("radius", event.target.value)}><option value="">{t("Not sure")}</option>{[5, 10, 25, 50].map((miles) => <option key={miles} value={miles}>{miles} {t("miles")}</option>)}</select></label> : null}
        <div className="form-actions field-full"><button type="button" className="button button-primary" onClick={continueToDetails}>{t("Continue")}</button><button type="button" className="hero-text-link" onClick={() => setIsOpen(false)}>{t("Cancel")}</button></div>
      </div> : <div className="field-grid">
        <label className="field"><span className="field-label">{t("Approximate budget (optional)")}</span><input value={draft.budget} maxLength={80} onChange={(event) => update("budget", event.target.value)} placeholder={t("$75/session or $250/month")} /></label>
        <label className="field"><span className="field-label">{t("Desired start timeframe")}</span><select value={draft.startTimeframe} onChange={(event) => update("startTimeframe", event.target.value)}><option value="">{t("Flexible")}</option><option value="as_soon_as_possible">{t("As soon as possible")}</option><option value="within_2_weeks">{t("Within 2 weeks")}</option><option value="within_1_month">{t("Within 1 month")}</option><option value="later">{t("Later")}</option></select></label>
        <label className="field"><span className="field-label">{t("Experience level")}</span><select value={draft.experience} onChange={(event) => update("experience", event.target.value)}><option value="">{t("Not applicable")}</option><option value="beginner">{t("Beginner")}</option><option value="intermediate">{t("Intermediate")}</option><option value="advanced">{t("Advanced")}</option><option value="not_sure">{t("Not sure")}</option></select></label>
        <label className="field"><span className="field-label">{t("General availability (optional)")}</span><input value={draft.availability} maxLength={500} onChange={(event) => update("availability", event.target.value)} placeholder={t("Weekday evenings, Saturday mornings...")} /></label>
        <fieldset className="field field-full concierge-choice-group"><legend className="field-label">{t("Preferred languages (optional)")}</legend><div className="concierge-choice-grid">{LANGUAGES.map((value) => <label key={value} className="concierge-check"><input type="checkbox" checked={draft.languages.includes(value)} onChange={() => toggleList("languages", value)} /><span>{t(value)}</span></label>)}</div><label className="concierge-check concierge-requirement"><input type="checkbox" checked={draft.languageRequired} disabled={!draft.languages.length} onChange={(event) => update("languageRequired", event.target.checked)} /><span>{t("A selected language is required, not just preferred")}</span></label></fieldset>
        <fieldset className="field field-full concierge-choice-group"><legend className="field-label">{t("Important preferences (optional)")}</legend><div className="concierge-choice-grid">{PREFERENCES.map((value) => <label key={value} className="concierge-check"><input type="checkbox" checked={draft.preferences.includes(value)} onChange={() => toggleList("preferences", value)} /><span>{t(value)}</span></label>)}</div></fieldset>
        <label className="field field-full"><span className="field-label">{t("Anything else we should know? (optional)")}</span><textarea value={draft.note} maxLength={1000} rows={3} onChange={(event) => update("note", event.target.value)} placeholder={t("Keep this concise and focused on the support you want.")} /><span className="field-help">{t("Do not include medical records, diagnoses, medication lists, passwords, payment details, or a precise home address.")}</span></label>
        <div className="concierge-sharing-notice field-full"><strong>{t("What may be shared")}</strong><p>{t("Elevare may share the goal, requested support, general location, service preferences, budget context, availability, experience, language preferences, and optional note with a small number of selected professionals. Your direct contact information stays hidden until you approve an introduction.")}</p><label className="concierge-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>{t("I agree that Elevare may share this request with selected professionals to evaluate fit.")}</span></label></div>
        {!user ? <div className="concierge-signin-note field-full"><strong>{t("Sign in to submit")}</strong><p>{t("Your draft is saved on this device. Sign in or create an account, then return here to submit it.")}</p><Link className="button button-secondary" href={`/sign-in/?redirect=${encodeURIComponent(`${pathname}#concierge-request`)}`}>{t("Sign in")}</Link></div> : null}
        <div className="form-actions field-full"><button type="button" className="button button-secondary" onClick={() => setStep(1)}>{t("Back")}</button><button type="submit" className="button button-primary" disabled={isSubmitting || !user}>{t(isSubmitting ? "Submitting..." : "Submit match request")}</button></div>
      </div>}
      {feedback ? <div className={`form-feedback ${feedback.type === "error" ? "is-error" : "is-success"}`} role="alert" aria-live="assertive">{feedback.message}</div> : null}
    </form> : null}
  </div>;
}
