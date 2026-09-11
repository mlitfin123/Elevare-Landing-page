"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useMarketplaceAccountState } from "@/components/marketplace/MarketplaceAccountShell";
import { trackEvent } from "@/lib/analytics";
import { localeFromPathname, localizePathname } from "@/lib/i18n/config";
import { localizeServiceMode, marketplaceText } from "@/lib/i18n/marketplace-content";
import {
  CONCIERGE_CASE_STATUS_LABELS,
  type ConciergeCase,
  type ConciergeRecommendation,
  humanizeConciergeValue,
} from "@/lib/marketplace-concierge";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Feedback = { type: "success" | "error"; message: string } | null;

export function ConciergeCasesPanel() {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const t = (value: string) => marketplaceText(locale, value);
  const { user, isConfigured, isLoading } = useMarketplaceAccountState();
  const [cases, setCases] = useState<ConciergeCase[]>([]);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const shortlistViewTracked = useRef(false);

  async function loadCases() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user) return;
    const { data, error } = await supabase.rpc("marketplace_get_my_concierge_cases");
    if (error) throw error;
    setCases((data as ConciergeCase[] | null) ?? []);
  }

  useEffect(() => {
    if (!user) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      loadCases()
        .catch(() => {
          if (active) setFeedback({ type: "error", message: t("We could not load your match requests right now.") });
        })
        .finally(() => {
          if (active) setLoadedForUserId(user.id);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
    // The signed-in user is the only dependency that changes the owned result set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const recommendationCount = cases.reduce((total, item) => total + item.recommendations.length, 0);
    if (shortlistViewTracked.current || recommendationCount === 0) return;
    shortlistViewTracked.current = true;
    trackEvent("concierge_shortlist_viewed", { recommendation_count: recommendationCount });
  }, [cases]);

  async function act(caseCode: string, action: string, recommendationCode?: string, reasonCode?: string, outcomeCode?: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || activeAction) return;
    setActiveAction(`${caseCode}:${action}:${recommendationCode ?? "case"}`);
    setFeedback(null);
    const { error } = await supabase.rpc("marketplace_client_concierge_action", {
      p_case_code: caseCode,
      p_action: action,
      p_recommendation_code: recommendationCode ?? null,
      p_reason_code: reasonCode ?? null,
      p_outcome_code: outcomeCode ?? null,
    });
    if (error) {
      setFeedback({ type: "error", message: t("That request could not be updated. Refresh and try again.") });
    } else {
      await loadCases();
      setFeedback({ type: "success", message: t("Your match request was updated.") });
      if (action === "select_professional") {
        trackEvent("concierge_professional_selected", { source: "concierge_shortlist" });
      } else if (action === "decline_professional") {
        trackEvent("concierge_recommendation_declined", { reason_code: reasonCode ?? "unspecified" });
      } else if (action === "request_rematch") {
        trackEvent("concierge_rematch_requested", { reason_code: reasonCode ?? "unspecified" });
      } else if (action === "close") {
        trackEvent("concierge_case_closed", { reason_code: reasonCode ?? "unspecified" });
      } else if (action === "report_outcome") {
        trackEvent("concierge_outcome_submitted", { outcome_code: outcomeCode ?? "unknown", self_reported: true });
      }
    }
    setActiveAction(null);
  }

  async function updatePreferences(caseCode: string, request: ConciergeCase["request"]) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || activeAction) return false;
    setActiveAction(`${caseCode}:preferences`);
    setFeedback(null);
    const { error } = await supabase.rpc("marketplace_update_my_concierge_request", {
      p_case_code: caseCode,
      p_service_mode: request.service_mode || null,
      p_location_label: request.location_label || null,
      p_travel_radius_miles: request.travel_radius_miles ?? null,
      p_budget_min_cents: request.budget_min_cents ?? null,
      p_budget_max_cents: request.budget_max_cents ?? null,
      p_start_timeframe: request.start_timeframe || null,
      p_general_availability: request.general_availability || null,
      p_experience_level: request.experience_level || null,
      p_preferred_languages: request.preferred_languages ?? [],
      p_language_required: request.language_required,
      p_service_preferences: request.service_preferences ?? [],
      p_note: request.note || null,
    });
    if (error) {
      setFeedback({ type: "error", message: t("Your preferences could not be saved. Review the fields and try again.") });
      setActiveAction(null);
      return false;
    }
    await loadCases();
    setFeedback({ type: "success", message: t("Your preferences were saved for review.") });
    trackEvent("concierge_preferences_updated", { source: "concierge_matches" });
    setActiveAction(null);
    return true;
  }

  if (!isConfigured) return <ConciergeState badge={t("Configuration needed")} title={t("Marketplace account tools are not configured yet.")} />;
  if (isLoading || (user && loadedForUserId !== user.id)) return <ConciergeState badge={t("Loading")} title={t("Loading your match requests.")} />;
  if (!user) {
    const redirect = localizePathname("/account/matches/", locale);
    return <ConciergeState badge={t("Sign in required")} title={t("Sign in to manage your match requests.")}><Link className="button button-primary" href={`/sign-in/?redirect=${encodeURIComponent(redirect)}`}>{t("Sign in")}</Link></ConciergeState>;
  }

  return (
    <section className="section concierge-account-section" aria-labelledby="concierge-cases-heading">
      <div className="section-head">
        <div className="eyebrow">{t("Concierge Matches")}</div>
        <h2 id="concierge-cases-heading" className="section-title">{t("Your match requests and recommendations.")}</h2>
        <p className="section-copy">{t("Elevare reviews each request and may share a short list when suitable, available professionals are found.")}</p>
      </div>

      {cases.length === 0 ? (
        <ConciergeState badge={t("No match requests yet")} title={t("Tell us what support you are looking for.")} copy={t("You can continue browsing freely or ask Elevare to help identify professionals who may fit.")}>
          <Link className="button button-primary" href={localizePathname("/professionals/#concierge-request", locale)}>{t("Help me find a professional")}</Link>
        </ConciergeState>
      ) : (
        <div className="concierge-case-list">
          {cases.map((item) => (
            <article className="panel concierge-case-card" key={item.case_code}>
              <div className="concierge-card-head">
                <div>
                  <span className="meta-pill">{t(CONCIERGE_CASE_STATUS_LABELS[item.status])}</span>
                  <h3>{item.request.primary_goal ? t(humanizeConciergeValue(item.request.primary_goal)!) : t("Professional support request")}</h3>
                  <p>{t("Submitted")} {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(item.created_at))} · {item.case_code}</p>
                </div>
              </div>
              <RequestSummary request={item.request} t={t} locale={locale} />
              {['reviewing', 'needs_client_information', 'rematch_requested', 'no_inventory'].includes(item.status) ? <ConciergePreferenceEditor item={item} disabled={Boolean(activeAction)} onSave={updatePreferences} t={t} /> : null}

              {item.status === "no_inventory" ? <div className="concierge-notice"><strong>{t("No suitable match available yet")}</strong><p>{t("We have not found an available professional who fits the request closely enough. Your request remains available for manual review, and you can request a rematch if your needs change.")}</p></div> : null}

              {item.recommendations.length ? (
                <div className="concierge-shortlist" aria-label={t("Professional recommendations")}>
                  <h4>{t("Professionals who may fit")}</h4>
                  {item.recommendations.map((recommendation) => (
                    <RecommendationCard key={recommendation.recommendation_code} recommendation={recommendation} caseCode={item.case_code} activeAction={activeAction} act={act} t={t} locale={locale} />
                  ))}
                </div>
              ) : <p className="field-help">{t("Recommendations will appear here only after they are reviewed and the professionals confirm availability.")}</p>}

              <div className="button-row concierge-case-actions">
                {!['closed', 'rematch_requested'].includes(item.status) ? <button type="button" className="button button-secondary" disabled={Boolean(activeAction)} onClick={() => void act(item.case_code, "request_rematch", undefined, "client_preferences_changed")}>{t("Request a rematch")}</button> : null}
                {['introduced', 'follow_up_due', 'consultation_reported'].includes(item.status) ? <OutcomeActions item={item} disabled={Boolean(activeAction)} act={act} t={t} /> : null}
                {item.status !== "closed" ? <button type="button" className="hero-text-link" disabled={Boolean(activeAction)} onClick={() => void act(item.case_code, "close", undefined, "client_closed")}>{t("Close request")}</button> : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="concierge-disclaimer">{t("Elevare provides discovery and introduction support only. Professionals are independent providers. A recommendation is not an endorsement, guarantee, medical referral, or promise of results, and an introduction is not a booking through Elevare.")}</p>
      {feedback ? <div className={`form-feedback ${feedback.type === "error" ? "is-error" : "is-success"}`} role="status" aria-live="polite">{feedback.message}</div> : null}
    </section>
  );
}

const EDITABLE_LANGUAGES = ["English", "Spanish", "Portuguese"];
const EDITABLE_PREFERENCES = ["Women-only support", "LGBTQ+ affirming", "Adaptive experience", "Competition experience"];

function ConciergePreferenceEditor({ item, disabled, onSave, t }: {
  item: ConciergeCase;
  disabled: boolean;
  onSave: (caseCode: string, request: ConciergeCase["request"]) => Promise<boolean>;
  t: (value: string) => string;
}) {
  const [draft, setDraft] = useState(item.request);
  const toggleList = (key: "preferred_languages" | "service_preferences", value: string) => {
    setDraft((current) => ({ ...current, [key]: current[key]?.includes(value) ? current[key]?.filter((entry) => entry !== value) : [...(current[key] ?? []), value] }));
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave(item.case_code, draft);
  }
  return <details className="concierge-preference-editor">
    <summary className="hero-text-link">{t("Update matching preferences")}</summary>
    <form className="concierge-form-grid" onSubmit={submit}>
      <label className="field"><span className="field-label">{t("Preferred service mode")}</span><select value={draft.service_mode ?? ""} onChange={(event) => setDraft({ ...draft, service_mode: event.target.value || null })}><option value="">{t("Either online or in person")}</option><option value="online">{t("Online")}</option><option value="in_person">{t("In person")}</option><option value="hybrid">{t("Hybrid")}</option></select></label>
      <label className="field"><span className="field-label">{t("City, ZIP code, or general location")}</span><input maxLength={160} value={draft.location_label ?? ""} onChange={(event) => setDraft({ ...draft, location_label: event.target.value || null })} /></label>
      <label className="field"><span className="field-label">{t("Acceptable travel radius")}</span><select value={draft.travel_radius_miles ?? ""} onChange={(event) => setDraft({ ...draft, travel_radius_miles: event.target.value ? Number(event.target.value) : null })}><option value="">{t("Not sure")}</option>{[5, 10, 25, 50].map((miles) => <option key={miles} value={miles}>{miles} {t("miles")}</option>)}</select></label>
      <label className="field"><span className="field-label">{t("Desired start timeframe")}</span><select value={draft.start_timeframe ?? ""} onChange={(event) => setDraft({ ...draft, start_timeframe: event.target.value || null })}><option value="">{t("Flexible")}</option><option value="as_soon_as_possible">{t("As soon as possible")}</option><option value="within_2_weeks">{t("Within 2 weeks")}</option><option value="within_1_month">{t("Within 1 month")}</option><option value="later">{t("Later")}</option></select></label>
      <label className="field"><span className="field-label">{t("Minimum budget (optional)")}</span><input type="number" min="0" step="1" inputMode="numeric" value={draft.budget_min_cents == null ? "" : draft.budget_min_cents / 100} onChange={(event) => setDraft({ ...draft, budget_min_cents: event.target.value ? Math.round(Number(event.target.value) * 100) : null })} /></label>
      <label className="field"><span className="field-label">{t("Maximum budget (optional)")}</span><input type="number" min="0" step="1" inputMode="numeric" value={draft.budget_max_cents == null ? "" : draft.budget_max_cents / 100} onChange={(event) => setDraft({ ...draft, budget_max_cents: event.target.value ? Math.round(Number(event.target.value) * 100) : null })} /></label>
      <label className="field"><span className="field-label">{t("Experience level")}</span><select value={draft.experience_level ?? ""} onChange={(event) => setDraft({ ...draft, experience_level: event.target.value || null })}><option value="">{t("Not applicable")}</option><option value="beginner">{t("Beginner")}</option><option value="intermediate">{t("Intermediate")}</option><option value="advanced">{t("Advanced")}</option><option value="not_sure">{t("Not sure")}</option></select></label>
      <label className="field"><span className="field-label">{t("General availability (optional)")}</span><input maxLength={500} value={draft.general_availability ?? ""} onChange={(event) => setDraft({ ...draft, general_availability: event.target.value || null })} /></label>
      <fieldset className="field field-full concierge-choice-group"><legend className="field-label">{t("Preferred languages (optional)")}</legend><div className="concierge-choice-grid">{EDITABLE_LANGUAGES.map((value) => <label key={value} className="concierge-check"><input type="checkbox" checked={draft.preferred_languages.includes(value)} onChange={() => toggleList("preferred_languages", value)} /><span>{t(value)}</span></label>)}</div><label className="concierge-check concierge-requirement"><input type="checkbox" checked={draft.language_required} disabled={!draft.preferred_languages.length} onChange={(event) => setDraft({ ...draft, language_required: event.target.checked })} /><span>{t("A selected language is required, not just preferred")}</span></label></fieldset>
      <fieldset className="field field-full concierge-choice-group"><legend className="field-label">{t("Important preferences (optional)")}</legend><div className="concierge-choice-grid">{EDITABLE_PREFERENCES.map((value) => <label key={value} className="concierge-check"><input type="checkbox" checked={draft.service_preferences?.includes(value) ?? false} onChange={() => toggleList("service_preferences", value)} /><span>{t(value)}</span></label>)}</div></fieldset>
      <label className="field field-full"><span className="field-label">{t("Anything else we should know? (optional)")}</span><textarea rows={3} maxLength={1000} value={draft.note ?? ""} onChange={(event) => setDraft({ ...draft, note: event.target.value || null })} /><span className="field-help">{t("Only update information relevant to finding the right professional. Do not include medical or payment information.")}</span></label>
      <div className="form-actions field-full"><button type="submit" className="button button-primary" disabled={disabled}>{t(disabled ? "Saving..." : "Save preferences for review")}</button></div>
    </form>
  </details>;
}

function RequestSummary({ request, t, locale }: { request: ConciergeCase["request"]; t: (value: string) => string; locale: ReturnType<typeof localeFromPathname> }) {
  const details = [
    ["Type of support", request.support_type ? t(humanizeConciergeValue(request.support_type)!) : null],
    ["Service mode", request.service_mode ? localizeServiceMode(request.service_mode, locale) : null],
    ["Location", request.location_label],
    ["Start timeframe", request.start_timeframe ? t(humanizeConciergeValue(request.start_timeframe)!) : null],
    ["Preferred languages", request.preferred_languages?.map(t).join(", ")],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  return <dl className="concierge-summary-grid">{details.map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}</dl>;
}

function RecommendationCard({ recommendation, caseCode, activeAction, act, t, locale }: {
  recommendation: ConciergeRecommendation;
  caseCode: string;
  activeAction: string | null;
  act: (caseCode: string, action: string, recommendationCode?: string, reasonCode?: string) => Promise<void>;
  t: (value: string) => string;
  locale: ReturnType<typeof localeFromPathname>;
}) {
  const profilePath = localizePathname(`/professionals/${recommendation.profile.slug}/`, locale);
  const selectable = recommendation.status === "shortlisted";
  return <article className="concierge-recommendation-card">
    <div>
      <span className="stat-label">{t("Potential fit")}</span>
      <h5>{recommendation.profile.display_name}</h5>
      <p>{recommendation.profile.professional_title}</p>
    </div>
    {recommendation.fit_summary ? <p>{recommendation.fit_summary}</p> : null}
    <div className="button-row">
      <Link className="button button-secondary" href={profilePath} onClick={() => trackEvent("concierge_professional_profile_opened", { source: "concierge_shortlist" })}>{t("View public profile")}</Link>
      {selectable ? <button type="button" className="button button-primary" disabled={Boolean(activeAction)} onClick={() => void act(caseCode, "select_professional", recommendation.recommendation_code)}>{t("Request an introduction")}</button> : null}
      {selectable ? <button type="button" className="hero-text-link" disabled={Boolean(activeAction)} onClick={() => void act(caseCode, "decline_professional", recommendation.recommendation_code, "not_a_fit")}>{t("Not a fit")}</button> : null}
    </div>
    {recommendation.introduced_at && recommendation.professional_contact_email ? <div className="concierge-contact"><strong>{t("Introduction completed")}</strong><p>{t("Contact email")}: <a href={`mailto:${recommendation.professional_contact_email}`}>{recommendation.professional_contact_email}</a></p><p>{t("Contact the professional directly to arrange a consultation. This is not a booking through Elevare.")}</p></div> : null}
  </article>;
}

function OutcomeActions({ item, disabled, act, t }: { item: ConciergeCase; disabled: boolean; act: (caseCode: string, action: string, recommendationCode?: string, reasonCode?: string, outcomeCode?: string) => Promise<void>; t: (value: string) => string }) {
  return <details className="concierge-outcome-menu"><summary className="button button-secondary">{t("Share an outcome")}</summary><div className="concierge-outcome-options">
    <button type="button" disabled={disabled} onClick={() => void act(item.case_code, "report_outcome", undefined, undefined, "consultation_scheduled_self_reported")}>{t("Consultation scheduled")}</button>
    <button type="button" disabled={disabled} onClick={() => void act(item.case_code, "report_outcome", undefined, undefined, "consultation_completed_self_reported")}>{t("Consultation completed")}</button>
    <button type="button" disabled={disabled} onClick={() => void act(item.case_code, "report_outcome", undefined, undefined, "hired_self_reported")}>{t("I hired this professional")}</button>
    <button type="button" disabled={disabled} onClick={() => void act(item.case_code, "report_outcome", undefined, "consultation_not_a_fit", "not_proceeding")}>{t("I chose not to proceed")}</button>
  </div></details>;
}

function ConciergeState({ badge, title, copy, children }: { badge: string; title: string; copy?: string; children?: React.ReactNode }) {
  return <article className="callout"><span className="meta-pill">{badge}</span><h2>{title}</h2>{copy ? <p>{copy}</p> : null}{children ? <div className="button-row">{children}</div> : null}</article>;
}
