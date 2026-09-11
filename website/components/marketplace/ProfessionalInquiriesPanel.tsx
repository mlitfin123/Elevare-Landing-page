"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useMarketplaceAccountState } from "@/components/marketplace/MarketplaceAccountShell";
import { CLIENT_TIMELINE_OPTIONS, getPreferenceLabel } from "@/lib/client-preferences";
import { trackEvent } from "@/lib/analytics";
import { localeFromPathname, localizePathname } from "@/lib/i18n/config";
import { localizeMarketplaceCategory, localizeServiceMode, marketplaceText } from "@/lib/i18n/marketplace-content";
import { buildProfessionalPath, formatCategoryList } from "@/lib/marketplace-helpers";
import type { MarketplaceSnapshot } from "@/lib/marketplace-types";
import {
  getProfessionalInquiryActions,
  getProfessionalInquiryStatusAfterAction,
  type ProfessionalInquiryAction,
  type ProfessionalInquiryStatus,
} from "@/lib/professional-retention";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type InquiryStatus = ProfessionalInquiryStatus;
type ReceivedInquiryRecord = {
  id: string;
  client_first_name: string;
  service_interest: string | null;
  goal: string;
  preferred_service_mode: string | null;
  start_timeline: string | null;
  message: string | null;
  status: InquiryStatus;
  created_at: string;
};
type SentInquiryRecord = Omit<ReceivedInquiryRecord, "client_first_name"> & { trainer_profile_id: string };
type ProfessionalInquiriesPanelProps = { mode?: "sent" | "received" };

const ACTION_LABELS: Record<Exclude<ProfessionalInquiryAction, "open">, string> = {
  accept: "Accept request",
  decline: "Decline request",
  mark_contacted: "Mark as contacted",
  close: "Close request",
};
const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "New",
  viewed: "Awaiting your response",
  accepted: "Accepted",
  declined: "Declined",
  contacted: "Contacted",
  closed: "Closed",
};

export function ProfessionalInquiriesPanel({ mode = "sent" }: ProfessionalInquiriesPanelProps) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const t = (value: string) => marketplaceText(locale, value);
  const { user, appUser, isLoading, isConfigured, professionalProfile } = useMarketplaceAccountState();
  const [snapshot, setSnapshot] = useState<MarketplaceSnapshot | null>(null);
  const [receivedInquiries, setReceivedInquiries] = useState<ReceivedInquiryRecord[]>([]);
  const [sentInquiries, setSentInquiries] = useState<SentInquiryRecord[]>([]);
  const [loadedActivityKey, setLoadedActivityKey] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (mode !== "sent") return;
    fetch("/marketplace-data.json")
      .then((response) => response.json())
      .then((data: MarketplaceSnapshot) => setSnapshot(data))
      .catch(() => setSnapshot({ generatedAt: null, categories: [], professionals: [] }));
  }, [mode]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !appUser) return;
    const currentAppUser = appUser;
    const currentProfessional = professionalProfile;
    const currentSupabase = supabase;
    let active = true;

    async function loadInquiries() {
      if (mode === "sent") {
        const { data, error } = await currentSupabase
          .from("trainer_profile_inquiries")
          .select("id,trainer_profile_id,service_interest,goal,preferred_service_mode,start_timeline,message,status,created_at")
          .eq("client_user_id", currentAppUser.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (active) {
          setSentInquiries((data as SentInquiryRecord[]) ?? []);
          setLoadedActivityKey(`sent:${currentAppUser.id}`);
        }
        return;
      }
      if (!currentProfessional) {
        if (active) {
          setReceivedInquiries([]);
          setLoadedActivityKey(`received:${currentAppUser.id}:none`);
        }
        return;
      }
      const { data, error } = await currentSupabase
        .from("trainer_profile_inquiries")
        .select("id,client_first_name,service_interest,goal,preferred_service_mode,start_timeline,message,status,created_at")
        .eq("trainer_profile_id", currentProfessional.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (active) {
        setReceivedInquiries((data as ReceivedInquiryRecord[]) ?? []);
        setLoadedActivityKey(`received:${currentAppUser.id}:${currentProfessional.id}`);
      }
    }

    void loadInquiries().catch(() => {
      if (!active) return;
      setFeedback(marketplaceText(locale, mode === "sent" ? "We could not load your requests right now." : "We could not load client requests right now."));
      setFeedbackType("error");
    });
    return () => { active = false; };
  }, [appUser, locale, mode, professionalProfile]);

  const professionalsById = useMemo(
    () => new Map((snapshot?.professionals ?? []).map((professional) => [professional.id, professional])),
    [snapshot],
  );
  const expectedActivityKey = appUser
    ? mode === "sent" ? `sent:${appUser.id}` : `received:${appUser.id}:${professionalProfile?.id ?? "none"}`
    : null;
  const visibleSentInquiries = loadedActivityKey === expectedActivityKey ? sentInquiries : [];
  const visibleReceivedInquiries = loadedActivityKey === expectedActivityKey ? receivedInquiries : [];
  const statusLabel = (status: InquiryStatus) => t(STATUS_LABELS[status]);
  const timelineLabel = (value: string | null) => value
    ? t(getPreferenceLabel(CLIENT_TIMELINE_OPTIONS, value) || value.replaceAll("_", " "))
    : null;

  async function transitionInquiry(inquiry: ReceivedInquiryRecord, action: ProfessionalInquiryAction) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !professionalProfile || activeAction) return false;
    const nextStatus = getProfessionalInquiryStatusAfterAction(inquiry.status, action);
    if (!nextStatus) return false;
    setActiveAction(`${inquiry.id}:${action}`);
    setFeedback(null);
    const { data, error } = await supabase.rpc("marketplace_transition_professional_inquiry", {
      p_inquiry_id: inquiry.id,
      p_action: action,
      p_expected_status: inquiry.status,
    });
    if (error) {
      setFeedback(t("This request could not be updated. Refresh and try again."));
      setFeedbackType("error");
      setActiveAction(null);
      return false;
    }
    const status = ((data as { status?: InquiryStatus } | null)?.status ?? nextStatus) as InquiryStatus;
    setReceivedInquiries((current) => current.map((item) => item.id === inquiry.id ? { ...item, status } : item));
    setFeedback(t("Client request status updated."));
    setFeedbackType("success");
    setActiveAction(null);
    const eventName = action === "open"
      ? "consultation_request_opened"
      : action === "accept"
        ? "consultation_request_accepted"
        : action === "decline"
          ? "consultation_request_declined"
          : null;
    if (eventName) trackEvent(eventName, { source_page: "professional_client_requests" });
    return true;
  }

  async function reviewInquiry(inquiry: ReceivedInquiryRecord) {
    if (inquiry.status === "new") {
      if (!await transitionInquiry(inquiry, "open")) return;
    } else {
      trackEvent("consultation_request_opened", { source_page: "professional_client_requests" });
    }
    setExpandedIds((current) => new Set(current).add(inquiry.id));
  }

  if (!isConfigured) return <AccountCallout badge={t("Configuration needed")} title={t("Marketplace auth is not configured yet.")} copy={t("Add the second Supabase public URL and anon key to enable marketplace account tools.")} />;
  if (isLoading) return <AccountCallout badge={t("Loading")} title={t("Loading your account activity.")} copy={t("One moment while we check your marketplace account.")} />;
  if (!user) {
    const redirectPath = localizePathname(mode === "sent" ? "/account/inquiries/" : "/account/client-requests/", locale);
    const signInPath = localizePathname(`/sign-in/?redirect=${encodeURIComponent(redirectPath)}`, locale);
    return <AccountCallout badge={t("Sign in required")} title={t(mode === "sent" ? "Sign in to view your requests." : "Sign in to view client requests.")}><Link className="button button-primary" href={signInPath}>{t("Sign in")}</Link></AccountCallout>;
  }
  if (mode === "received" && !professionalProfile) {
    return <AccountCallout badge={t("For professionals")} title={t("Join Elevare as a Pro to receive client requests.")} copy={t("Create and submit your Pro Profile before it can appear publicly in marketplace search.")}><Link className="button button-secondary" href={localizePathname("/account/professional-profile/", locale)}>{t("Join as a Pro")}</Link></AccountCallout>;
  }

  if (mode === "sent") {
    return (
      <section className="section">
        <div className="section-head"><div className="eyebrow">{t("My Requests")}</div><h2 className="section-title">{t("Consultation requests you've sent.")}</h2><p className="section-copy">{t("Review your outreach and the current status of each request.")}</p></div>
        {visibleSentInquiries.length ? <div className="account-list">{visibleSentInquiries.map((inquiry) => {
          const professional = professionalsById.get(inquiry.trainer_profile_id) ?? null;
          const categories = professional?.categories.map((category) => localizeMarketplaceCategory(category, locale)) ?? [];
          return <article key={inquiry.id} className="panel account-list-card">
            <span className="meta-pill">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(inquiry.created_at))}</span>
            <h3>{professional?.displayName ?? t("Professional profile")}</h3>
            <p>{professional?.professionalTitle ?? (professional ? formatCategoryList(categories) : t("This request is tied to a professional profile."))}</p>
            <InquiryDetails inquiry={inquiry} statusLabel={statusLabel} timelineLabel={timelineLabel} locale={locale} t={t} includeStatus />
            {professional ? <Link className="button button-secondary" href={localizePathname(buildProfessionalPath(professional.profileSlug), locale)}>{t("View profile")}</Link> : null}
          </article>;
        })}</div> : <AccountCallout badge={t("No requests yet")} title={t("You have not sent any consultation requests yet.")} copy={t("Browse Elevare and reach out when you find someone who looks like a strong fit.")}><Link className="button button-primary" href={localizePathname("/professionals/", locale)}>{t("Explore Elevare")}</Link></AccountCallout>}
        <Feedback value={feedback} type={feedbackType} />
      </section>
    );
  }

  return (
    <section className="section">
      <div className="section-head"><div className="eyebrow">{t("Client Requests")}</div><h2 className="section-title">{t("Consultation requests sent to your Pro Profile.")}</h2><p className="section-copy">{t("Review potential client needs and take the next appropriate action.")}</p></div>
      {visibleReceivedInquiries.length ? <div className="account-list">{visibleReceivedInquiries.map((inquiry) => {
        const expanded = expandedIds.has(inquiry.id);
        const actions = getProfessionalInquiryActions(inquiry.status).filter((action) => action !== "open");
        return <article key={inquiry.id} className="panel account-list-card professional-request-card">
          <div className="account-summary-head"><div><span className="meta-pill">{statusLabel(inquiry.status)}</span><h3>{inquiry.client_first_name || t("Potential client")}</h3><p>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(inquiry.created_at))}</p></div>{!expanded ? <button type="button" className="button button-secondary" disabled={Boolean(activeAction)} aria-expanded="false" onClick={() => void reviewInquiry(inquiry)}>{t("Review request")}</button> : null}</div>
          {expanded ? <div className="professional-request-details">
            <InquiryDetails inquiry={inquiry} statusLabel={statusLabel} timelineLabel={timelineLabel} locale={locale} t={t} />
            {actions.length ? <div className="button-row" aria-label={t("Request actions")}>{actions.map((action) => <button key={action} type="button" className={action === "accept" ? "button button-primary" : "button button-secondary"} disabled={Boolean(activeAction)} onClick={() => void transitionInquiry(inquiry, action)}>{t(ACTION_LABELS[action])}</button>)}</div> : <p className="field-help">{t("No further action is required for this request.")}</p>}
            <button type="button" className="hero-text-link" onClick={() => setExpandedIds((current) => { const next = new Set(current); next.delete(inquiry.id); return next; })}>{t("Hide details")}</button>
          </div> : null}
        </article>;
      })}</div> : <AccountCallout badge={t("Ready for client requests")} title={t("No consultation requests have come in yet.")} copy={t("New inquiries will appear here when potential clients contact you through your Pro Profile.")}><Link className="button button-secondary" href={localizePathname("/account/professional-profile/", locale)}>{t("Review Pro Profile")}</Link></AccountCallout>}
      <Feedback value={feedback} type={feedbackType} />
    </section>
  );
}

function InquiryDetails({ inquiry, statusLabel, timelineLabel, locale, t, includeStatus = false }: {
  inquiry: ReceivedInquiryRecord | SentInquiryRecord;
  statusLabel: (status: InquiryStatus) => string;
  timelineLabel: (value: string | null) => string | null;
  locale: ReturnType<typeof localeFromPathname>;
  t: (value: string) => string;
  includeStatus?: boolean;
}) {
  return <ul className="professional-request-context">
    {includeStatus ? <li><strong>{t("Status")}:</strong> {statusLabel(inquiry.status)}</li> : null}
    <li><strong>{t("Goal")}:</strong> {inquiry.goal}</li>
    {inquiry.service_interest ? <li><strong>{t("Service")}:</strong> {inquiry.service_interest}</li> : null}
    {inquiry.preferred_service_mode ? <li><strong>{t("Preferred mode")}:</strong> {localizeServiceMode(inquiry.preferred_service_mode, locale)}</li> : null}
    {inquiry.start_timeline ? <li><strong>{t("Start timeline")}:</strong> {timelineLabel(inquiry.start_timeline)}</li> : null}
    {inquiry.message ? <li><strong>{t("Message")}:</strong> {inquiry.message}</li> : null}
  </ul>;
}

function AccountCallout({ badge, title, copy, children }: { badge: string; title: string; copy?: string; children?: ReactNode }) {
  return <article className="callout account-page-callout"><span className="meta-pill">{badge}</span><h2>{title}</h2>{copy ? <p>{copy}</p> : null}{children ? <div className="button-row">{children}</div> : null}</article>;
}

function Feedback({ value, type }: { value: string | null; type: "success" | "error" }) {
  return value ? <div className={`form-feedback ${type === "error" ? "is-error" : "is-success"}`} role="status" aria-live="polite">{value}</div> : null;
}
