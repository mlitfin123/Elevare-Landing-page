"use client";
import { saveProfessionalSection } from "@/lib/professional-publication-client";
import { getProfessionalPublicationMessages } from "@/lib/i18n/professional-publication-messages";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMarketplaceAccountState } from "@/components/marketplace/MarketplaceAccountShell";
import { trackEvent } from "@/lib/analytics";
import { localeFromPathname, localizePathname } from "@/lib/i18n/config";
import { marketplaceText } from "@/lib/i18n/marketplace-content";
import { buildProfessionalPath } from "@/lib/marketplace-helpers";
import { calculateProfileCompleteness } from "@/lib/professional-profile";
import { getProfessionalProfileFreshness } from "@/lib/professional-retention";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ProfessionalProfileSharing } from "@/components/marketplace/ProfessionalProfileSharing";

type Summary = {
  range_days: number;
  profile_status: string;
  is_live: boolean;
  acceptance_status: string;
  profile_updated_at: string;
  profile_confirmed_at: string | null;
  views_in_range: number;
  views_all_time: number;
  current_saves: number;
  requests_in_range: number;
  requests_all_time: number;
  requests_awaiting_response: number;
  requests_new: number;
  response_lookback_days: number;
  response_sample_size: number;
  response_rate_percent: number | null;
  median_first_response_minutes: number | null;
};

type ProfileRow = {
  bio: string | null;
  years_experience: number | null;
  location_city: string | null;
  location_state: string | null;
  country_code: string | null;
  marketplace_specialties: string[] | null;
  marketplace_goal_tags: string[] | null;
  experience_levels_served: string[] | null;
  public_headline: string | null;
  best_fit_summary: string | null;
  consultation_expectations: string | null;
  client_acceptance_status: string | null;
  typical_availability: string[] | null;
  marketplace_price_min_cents: number | null;
  contact_for_pricing: boolean | null;
  public_display_name: string | null;
  professional_title: string | null;
  updated_at: string;
  profile_information_confirmed_at: string | null;
};

type MatchingRow = { delivery_modes: string[] | null };
type ServiceRow = { name: string; price_min_cents: number | null; contact_for_pricing: boolean | null; is_active: boolean | null };
type CategoryRow = { is_primary: boolean | null };

const ACCEPTANCE_OPTIONS = [
  { value: "accepting", label: "Accepting clients" },
  { value: "waitlist", label: "Limited availability" },
  { value: "not_accepting", label: "Not accepting clients" },
] as const;

function parseStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function formatResponseTime(minutes: number, translate: (value: string) => string) {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} ${translate("minutes")}`;
  if (minutes < 1_440) return `${Math.round(minutes / 60)} ${translate("hours")}`;
  return `${Math.round(minutes / 1_440)} ${translate("days")}`;
}

export function ProfessionalRetentionDashboard() {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const t = (value: string) => marketplaceText(locale, value);
  const { appUser, professionalProfile } = useMarketplaceAccountState();
  const [rangeDays, setRangeDays] = useState<30 | 3650>(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [matching, setMatching] = useState<MatchingRow | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [propagationDelayed, setPropagationDelayed] = useState(false);
  const [saveConflict, setSaveConflict] = useState(false);
  const publicationCopy = getProfessionalPublicationMessages(locale);

  async function retryPublication() {
    const result = await saveProfessionalSection({ action: "retry" });
    setPropagationDelayed(result.propagation !== "current");
    setFeedback(result.propagation === "current" ? publicationCopy.propagated : publicationCopy.delayed);
  }

  async function reloadSavedProfile() {
    const client = getSupabaseBrowserClient();
    if (!client || !professionalProfile) return;
    const result = await client.from("trainer_profiles")
      .select("client_acceptance_status,updated_at,profile_information_confirmed_at")
      .eq("id", professionalProfile.id).single();
    if (result.error) { setFeedback(publicationCopy.failed); return; }
    setProfile((current) => current ? { ...current, ...result.data } : current);
    setSummary((current) => current ? { ...current, acceptance_status: result.data.client_acceptance_status } : current);
    setSaveConflict(false);
    setFeedback(null);
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !professionalProfile) return;
    const currentSupabase = supabase;
    const currentProfessional = professionalProfile;
    let active = true;

    async function load() {
      setIsLoading(true);
      const [summaryResult, profileResult, matchingResult, servicesResult, categoriesResult] = await Promise.all([
        currentSupabase.rpc("marketplace_get_professional_retention_summary", { p_days: rangeDays }),
        currentSupabase.from("trainer_profiles")
          .select("bio,years_experience,location_city,location_state,country_code,marketplace_specialties,marketplace_goal_tags,experience_levels_served,public_headline,best_fit_summary,consultation_expectations,client_acceptance_status,typical_availability,marketplace_price_min_cents,contact_for_pricing,public_display_name,professional_title,updated_at,profile_information_confirmed_at")
          .eq("id", currentProfessional.id).single(),
        currentSupabase.from("provider_matching_profiles").select("delivery_modes").eq("trainer_profile_id", currentProfessional.id).maybeSingle(),
        currentSupabase.from("trainer_service_offerings").select("name,price_min_cents,contact_for_pricing,is_active").eq("trainer_profile_id", currentProfessional.id),
        currentSupabase.from("trainer_services").select("is_primary").eq("trainer_profile_id", currentProfessional.id),
      ]);

      if (!active) return;
      if (summaryResult.error || profileResult.error) {
        setFeedback(marketplaceText(locale, "We could not load your professional dashboard right now."));
      } else {
        setSummary(summaryResult.data as Summary);
        setProfile(profileResult.data as ProfileRow);
        setMatching((matchingResult.data as MatchingRow | null) ?? null);
        setServices((servicesResult.data as ServiceRow[] | null) ?? []);
        setCategories((categoriesResult.data as CategoryRow[] | null) ?? []);
      }
      setIsLoading(false);
    }

    void load();
    trackEvent("professional_dashboard_viewed", { range_days: rangeDays });
    return () => { active = false; };
  }, [locale, professionalProfile, rangeDays]);

  const completeness = useMemo(() => calculateProfileCompleteness({
    name: profile?.public_display_name ?? "",
    professionalTitle: profile?.professional_title ?? "",
    profilePhotoUrl: appUser?.profile_photo_url ?? "",
    bio: profile?.bio ?? "",
    publicHeadline: profile?.public_headline ?? "",
    bestFitSummary: profile?.best_fit_summary ?? "",
    goalTags: parseStringArray(profile?.marketplace_goal_tags),
    experienceLevelsServed: parseStringArray(profile?.experience_levels_served),
    yearsExperience: profile?.years_experience == null ? "" : String(profile.years_experience),
    consultationExpectations: profile?.consultation_expectations ?? "",
    primaryCategory: categories.some((entry) => entry.is_primary) ? "selected" : "",
    specialties: parseStringArray(profile?.marketplace_specialties),
    serviceModes: parseStringArray(matching?.delivery_modes),
    countryCode: profile?.country_code ?? "US",
    city: profile?.location_city ?? "",
    state: profile?.location_state ?? "",
    services: services.map((service) => ({
      name: service.name,
      priceFrom: service.price_min_cents == null ? "" : String(service.price_min_cents / 100),
      contactForPricing: Boolean(service.contact_for_pricing),
      isActive: service.is_active !== false,
    })),
    profilePriceFrom: profile?.marketplace_price_min_cents == null ? "" : String(profile.marketplace_price_min_cents / 100),
    profileContactForPricing: Boolean(profile?.contact_for_pricing),
    availability: parseStringArray(profile?.typical_availability),
    acceptanceStatus: profile?.client_acceptance_status ?? "",
  }), [appUser, categories, matching, profile, services]);

  const freshness = getProfessionalProfileFreshness(
    profile?.profile_information_confirmed_at ?? null,
    profile?.updated_at ?? null,
  );
  const number = new Intl.NumberFormat(locale);
  const publicPath = professionalProfile?.publicSlug
    ? localizePathname(buildProfessionalPath(professionalProfile.publicSlug), locale)
    : null;

  async function updateAvailability(value: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !profile) return;
    setIsSaving(true);
    setFeedback(null);
    const { data, error, propagation } = await saveProfessionalSection({
      action: "availability", status: value, version: profile.updated_at,
    });
    if (error) {
      setSaveConflict(error.code === "conflict" || error.code === "network");
      setFeedback(error.code === "conflict" ? publicationCopy.conflict : error.code === "network" ? publicationCopy.uncertain : t("Your availability could not be updated. Refresh and try again."));
    } else {
      const result = data as { status: string; updated_at: string; confirmed_at: string | null };
      setProfile((current) => current ? {
        ...current,
        client_acceptance_status: result.status,
        updated_at: result.updated_at,
      } : current);
      setSummary((current) => current ? { ...current, acceptance_status: result.status } : current);
      setPropagationDelayed(propagation === "delayed");
      setFeedback(propagation === "delayed" ? getProfessionalPublicationMessages(locale).delayed : t("Availability updated."));
      trackEvent("professional_availability_changed", { availability_status: value });
    }
    setIsSaving(false);
  }

  async function confirmProfile() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !profile) return;
    setIsSaving(true);
    setFeedback(null);
    const { data, error, propagation } = await saveProfessionalSection({
      action: "confirmation", version: profile.updated_at,
    });
    if (error) {
      setFeedback(t("Your profile could not be confirmed. Refresh and try again."));
    } else {
      const result = data as { updated_at: string; confirmed_at: string };
      setProfile((current) => current ? {
        ...current,
        updated_at: result.updated_at,
        profile_information_confirmed_at: result.confirmed_at,
      } : current);
      setFeedback(propagation === "delayed" ? getProfessionalPublicationMessages(locale).delayed : t("Your profile information is confirmed as current."));
      setPropagationDelayed(propagation === "delayed");
      trackEvent("professional_profile_confirmation_completed", { freshness_state: "current" });
    }
    setIsSaving(false);
  }

  if (!professionalProfile) return null;

  return (
    <section className="section account-overview-section professional-retention" aria-labelledby="professional-dashboard-heading">
      <div className="section-head section-head-compact">
        <div className="eyebrow">{t("Professional dashboard")}</div>
        <h2 id="professional-dashboard-heading" className="section-title section-title-compact">{t("Profile performance and next steps")}</h2>
        <p className="section-copy">{t("Keep your profile current, respond to consultation requests, and see how clients are finding you.")}</p>
      </div>

      {isLoading ? <div className="panel retention-loading" role="status">{t("Loading your professional dashboard...")}</div> : null}
      {!isLoading && summary && profile ? (
        <>
          <div className="retention-priority-grid">
            <article className="panel retention-priority-card">
              <span className="stat-label">{t("Profile status")}</span>
              <h3>{t(summary.is_live ? "Your profile is live" : "Your profile is not live yet")}</h3>
              <p>{professionalProfile.statusMessage ? t(professionalProfile.statusMessage) : t("Profile publication remains controlled by Elevare review.")}</p>
              <div className="button-row">
                <Link className="button button-secondary" href={localizePathname("/account/professional-profile/", locale)}>{t("Edit profile")}</Link>
                {publicPath ? <Link className="button button-secondary" href={publicPath}>{t("View public profile")}</Link> : null}
              </div>
            </article>

            <article className="panel retention-priority-card">
              <label className="field" htmlFor="professional-availability">
                <span className="stat-label">{t("New-client availability")}</span>
                <select id="professional-availability" value={summary.acceptance_status} disabled={isSaving} onChange={(event) => void updateAvailability(event.target.value)}>
                  {ACCEPTANCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
                </select>
              </label>
              <p>{summary.acceptance_status === "not_accepting"
                ? t("Your profile remains visible, but new consultation requests are disabled.")
                : t("This status appears on your public profile and helps clients understand your availability.")}</p>
            </article>

            <article className={`panel retention-priority-card${summary.requests_awaiting_response > 0 ? " is-attention" : ""}`}>
              <span className="stat-label">{t("Awaiting your response")}</span>
              <strong className="retention-priority-value">{number.format(summary.requests_awaiting_response)}</strong>
              <p>{summary.requests_awaiting_response > 0 ? t("Review these requests and respond when you have enough information to assess fit.") : t("No consultation requests are waiting for your response.")}</p>
              <Link className="button button-primary" href={localizePathname("/account/client-requests/", locale)}>{t("Review client requests")}</Link>
            </article>
          </div>

          {publicPath && professionalProfile.isPubliclyListed && summary.is_live ? (
            <ProfessionalProfileSharing
              key={JSON.stringify([publicPath, locale, profile.public_display_name, profile.professional_title, profile.marketplace_specialties, appUser?.profile_photo_url])}
              publicPath={publicPath}
              name={profile.public_display_name || [appUser?.first_name, appUser?.last_name].filter(Boolean).join(" ") || "Elevare"}
              title={profile.professional_title || ""}
              specialties={parseStringArray(profile.marketplace_specialties)}
              photoUrl={appUser?.profile_photo_url ?? null}
              locale={locale}
            />
          ) : null}

          <div className="retention-range" aria-label={t("Dashboard date range")}>
            <button type="button" aria-pressed={rangeDays === 30} onClick={() => setRangeDays(30)}>{t("Last 30 days")}</button>
            <button type="button" aria-pressed={rangeDays === 3650} onClick={() => setRangeDays(3650)}>{t("All time")}</button>
          </div>

          <div className="retention-metrics">
            <article className="panel"><span className="stat-label">{t("Recorded profile page views")}</span><strong className={(rangeDays === 30 ? summary.views_in_range : summary.views_all_time) === 0 ? "profile-view-empty" : undefined}>{(rangeDays === 30 ? summary.views_in_range : summary.views_all_time) === 0 ? t("No recorded views yet") : number.format(rangeDays === 30 ? summary.views_in_range : summary.views_all_time)}</strong><p>{t("Page visits, not unique people. Repeat visits may count. Some visits aren't included because of visitors' privacy choices.")}</p><p>{t("Known bots and identifiable owner/admin visits are excluded. Earlier totals include consent-based counts.")}</p>{rangeDays === 30 ? <p>{t("Daily view totals cover today and the previous 29 days in UTC.")}</p> : null}</article>
            <article className="panel"><span className="stat-label">{t("Current saves")}</span><strong>{number.format(summary.current_saves)}</strong><p>{t("The number of clients who currently have your profile saved. Saver identities remain private.")}</p></article>
            <article className="panel"><span className="stat-label">{t("Consultation requests")}</span><strong>{number.format(rangeDays === 30 ? summary.requests_in_range : summary.requests_all_time)}</strong><p>{rangeDays === 30 ? t("Requests received in the last 30 days.") : t("Requests received since your profile was created.")}</p></article>
            <article className="panel"><span className="stat-label">{t("Response reliability")}</span><strong>{summary.response_rate_percent == null ? t("Not enough history yet") : `${number.format(summary.response_rate_percent)}%`}</strong><p>{summary.response_rate_percent == null || summary.median_first_response_minutes == null ? t("Shown after at least three requests within 90 days.") : `${t("Median first response")}: ${formatResponseTime(summary.median_first_response_minutes, t)}.`}</p></article>
          </div>

          <div className="retention-detail-grid">
            <article className="panel retention-detail-card">
              <div className="account-summary-head"><div><span className="stat-label">{t("Profile completeness")}</span><h3>{number.format(completeness.percent)}%</h3></div></div>
              {completeness.missing.length ? (
                <ul className="retention-checklist">
                  {completeness.items.filter((item) => !item.complete).slice(0, 6).map((item) => (
                    <li key={item.id}>
                      <Link href={`${localizePathname("/account/professional-profile/", locale)}#profile-field-${item.id}`} onClick={() => trackEvent("professional_profile_improvement_selected", { item_key: item.id, section: item.section })}>{t(item.label)}</Link>
                    </li>
                  ))}
                </ul>
              ) : <p>{t("Your profile includes the core information clients need to evaluate fit.")}</p>}
            </article>

            <article className="panel retention-detail-card">
              <span className="stat-label">{t("Profile freshness")}</span>
              <h3>{freshness.isCurrent ? t("Information confirmed current") : t("Confirm your profile details")}</h3>
              <p>{t("Review your services, pricing, location, and availability, then confirm that they remain accurate. This is not credential verification.")}</p>
              <p className="field-help">{t("Profile last updated")}: {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(profile.updated_at))}</p>
              {!freshness.isCurrent ? <button type="button" className="button button-secondary" disabled={isSaving} onClick={() => void confirmProfile()}>{t("Confirm information is current")}</button> : null}
            </article>
          </div>
        </>
      ) : null}
      {isSaving ? <p role="status" aria-live="polite">{publicationCopy.saving}</p> : null}
      {feedback ? <div className="form-feedback" role="status" aria-live="polite">{feedback}</div> : null}
      {propagationDelayed ? <button type="button" className="button button-secondary" onClick={() => void retryPublication()}>{publicationCopy.retry}</button> : null}
      {saveConflict ? <button type="button" className="button button-secondary" onClick={() => void reloadSavedProfile()}>{publicationCopy.reload}</button> : null}
    </section>
  );
}
