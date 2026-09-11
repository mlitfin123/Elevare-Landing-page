"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useMarketplaceAccountState } from "@/components/marketplace/MarketplaceAccountShell";
import { localeFromPathname, localizePathname } from "@/lib/i18n/config";
import { localizeServiceMode, marketplaceText } from "@/lib/i18n/marketplace-content";
import {
  CONCIERGE_INVITATION_STATUS_LABELS,
  type ConciergeInvitation,
  humanizeConciergeValue,
  isInvitationActionable,
} from "@/lib/marketplace-concierge";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function ProfessionalOpportunitiesPanel() {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const t = (value: string) => marketplaceText(locale, value);
  const { user, professionalProfile, isLoading, isConfigured } = useMarketplaceAccountState();
  const [invitations, setInvitations] = useState<ConciergeInvitation[]>([]);
  const [loadedForProfileId, setLoadedForProfileId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [clarification, setClarification] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function loadInvitations() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user || !professionalProfile) return;
    const { data, error } = await supabase.rpc("marketplace_get_my_concierge_invitations");
    if (error) throw error;
    setInvitations((data as ConciergeInvitation[] | null) ?? []);
  }

  useEffect(() => {
    if (!user || !professionalProfile) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      loadInvitations().catch(() => {
        if (active) setFeedback({ type: "error", message: t("We could not load match opportunities right now.") });
      }).finally(() => {
        if (active) setLoadedForProfileId(professionalProfile.id);
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionalProfile?.id, user?.id]);

  async function respond(invitation: ConciergeInvitation, action: "interested" | "declined" | "clarification_requested", reasonCode?: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || activeAction) return;
    const note = clarification[invitation.invitation_code]?.trim() || null;
    if (action === "clarification_requested" && !note) {
      setFeedback({ type: "error", message: t("Add a short clarification request first.") });
      return;
    }
    setActiveAction(`${invitation.invitation_code}:${action}`);
    setFeedback(null);
    const { error } = await supabase.rpc("marketplace_respond_to_concierge_invitation", {
      p_invitation_code: invitation.invitation_code,
      p_action: action,
      p_expected_status: invitation.status,
      p_reason_code: reasonCode ?? null,
      p_clarification_note: action === "clarification_requested" ? note : null,
      p_confirm_accepting_clients: action === "interested",
    });
    if (error) setFeedback({ type: "error", message: t("That response could not be saved. Refresh and try again.") });
    else {
      await loadInvitations();
      setFeedback({ type: "success", message: t("Your response was saved.") });
    }
    setActiveAction(null);
  }

  if (!isConfigured) return <PanelState badge={t("Configuration needed")} title={t("Marketplace account tools are not configured yet.")} />;
  if (isLoading || (user && professionalProfile && loadedForProfileId !== professionalProfile.id)) return <PanelState badge={t("Loading")} title={t("Loading your match opportunities.")} />;
  if (!user) {
    const redirect = localizePathname("/account/opportunities/", locale);
    return <PanelState badge={t("Sign in required")} title={t("Sign in to review match opportunities.")}><Link className="button button-primary" href={`/sign-in/?redirect=${encodeURIComponent(redirect)}`}>{t("Sign in")}</Link></PanelState>;
  }
  if (!professionalProfile) return <PanelState badge={t("For professionals")} title={t("Create a Pro Profile before receiving match opportunities.")}><Link className="button button-secondary" href={localizePathname("/account/professional-profile/", locale)}>{t("Join as a Pro")}</Link></PanelState>;

  return <section className="section concierge-account-section" aria-labelledby="opportunities-heading">
    <div className="section-head"><div className="eyebrow">{t("Match Opportunities")}</div><h2 id="opportunities-heading" className="section-title">{t("Review private concierge opportunities.")}</h2><p className="section-copy">{t("Each opportunity includes only the information a client knowingly submitted for matching. Expressing interest is not a booking or employment agreement.")}</p></div>
    {invitations.length === 0 ? <PanelState badge={t("No opportunities yet")} title={t("No concierge opportunities are waiting for your response.")} copy={t("New opportunities may appear when your approved profile, services, availability, and a client request are a close fit.")} /> : <div className="concierge-case-list">{invitations.map((invitation) => {
      const actionable = isInvitationActionable(invitation.status);
      const expired = Boolean(invitation.response_deadline_at && new Date(invitation.response_deadline_at) < new Date());
      return <article key={invitation.invitation_code} className="panel concierge-case-card">
        <div className="concierge-card-head"><div><span className="meta-pill">{t(CONCIERGE_INVITATION_STATUS_LABELS[invitation.status])}</span><h3>{invitation.request.primary_goal ? t(humanizeConciergeValue(invitation.request.primary_goal)!) : t("Potential client request")}</h3><p>{invitation.case_code}</p></div>{invitation.response_deadline_at ? <p><strong>{t("Respond by")}</strong><br />{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(invitation.response_deadline_at))}</p> : null}</div>
        <OpportunitySummary invitation={invitation} locale={locale} t={t} />
        {actionable && !expired ? <div className="concierge-response-actions">
          <label className="field field-full"><span className="field-label">{t("Need clarification from Elevare?")}</span><textarea rows={2} maxLength={750} value={clarification[invitation.invitation_code] ?? ""} onChange={(event) => setClarification((current) => ({ ...current, [invitation.invitation_code]: event.target.value }))} placeholder={t("Ask a concise question without requesting direct client contact.")} /></label>
          <div className="button-row"><button type="button" className="button button-primary" disabled={Boolean(activeAction)} onClick={() => void respond(invitation, "interested")}>{t("I am interested and accepting clients")}</button><button type="button" className="button button-secondary" disabled={Boolean(activeAction)} onClick={() => void respond(invitation, "clarification_requested")}>{t("Ask Elevare for clarification")}</button></div>
          <details className="concierge-outcome-menu"><summary className="hero-text-link">{t("Decline opportunity")}</summary><div className="concierge-outcome-options">{[
            ["not_accepting_clients", "Not accepting new clients"], ["schedule_mismatch", "Schedule mismatch"], ["location_mismatch", "Location mismatch"], ["budget_mismatch", "Budget mismatch"], ["outside_scope", "Outside professional scope"], ["not_a_fit", "Not a suitable fit"], ["conflict_of_interest", "Conflict of interest"], ["other", "Other"],
          ].map(([code, label]) => <button type="button" key={code} disabled={Boolean(activeAction)} onClick={() => void respond(invitation, "declined", code)}>{t(label)}</button>)}</div></details>
        </div> : expired && actionable ? <p className="concierge-notice">{t("This response window has expired. Contact Elevare support if the opportunity should be reviewed again.")}</p> : null}
        {invitation.introduced_at && invitation.client_contact_email ? <div className="concierge-contact"><strong>{t("Introduction completed")}</strong><p>{t("Client contact email")}: <a href={`mailto:${invitation.client_contact_email}`}>{invitation.client_contact_email}</a></p><p>{t("Contact the client directly to arrange a consultation. This is not a booking through Elevare.")}</p></div> : null}
      </article>;
    })}</div>}
    <p className="concierge-disclaimer">{t("You are an independent provider, not an employee or agent of Elevare. Keep client-submitted information private and use it only to evaluate and follow up on this opportunity.")}</p>
    {feedback ? <div className={`form-feedback ${feedback.type === "error" ? "is-error" : "is-success"}`} role="status" aria-live="polite">{feedback.message}</div> : null}
  </section>;
}

function OpportunitySummary({ invitation, locale, t }: { invitation: ConciergeInvitation; locale: ReturnType<typeof localeFromPathname>; t: (value: string) => string }) {
  const request = invitation.request;
  const details = [
    ["Type of support", request.support_type ? t(humanizeConciergeValue(request.support_type)!) : null], ["Professional category", request.category_slug ? t(humanizeConciergeValue(request.category_slug)!) : null], ["Specialty", request.specialty], ["Service mode", request.service_mode ? localizeServiceMode(request.service_mode, locale) : null], ["General location", request.location_label], ["Travel radius", request.travel_radius_miles ? `${request.travel_radius_miles} ${t("miles")}` : null], ["Start timeframe", request.start_timeframe ? t(humanizeConciergeValue(request.start_timeframe)!) : null], ["Experience level", request.experience_level ? t(humanizeConciergeValue(request.experience_level)!) : null], ["Preferred languages", request.preferred_languages?.map(t).join(", ")], ["General availability", request.general_availability],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  return <><dl className="concierge-summary-grid">{details.map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}</dl>{request.note ? <div className="concierge-client-note"><strong>{t("Client note")}</strong><p>{request.note}</p></div> : null}</>;
}

function PanelState({ badge, title, copy, children }: { badge: string; title: string; copy?: string; children?: React.ReactNode }) {
  return <article className="callout"><span className="meta-pill">{badge}</span><h2>{title}</h2>{copy ? <p>{copy}</p> : null}{children ? <div className="button-row">{children}</div> : null}</article>;
}
