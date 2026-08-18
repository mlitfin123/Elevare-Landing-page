"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMarketplaceAccountState } from "@/components/marketplace/MarketplaceAccountShell";
import { CLIENT_TIMELINE_OPTIONS, getPreferenceLabel } from "@/lib/client-preferences";
import { buildProfessionalPath, formatCategoryList } from "@/lib/marketplace-helpers";
import type { MarketplaceSnapshot } from "@/lib/marketplace-types";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type InquiryStatus = "new" | "viewed" | "contacted" | "closed";

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

type SentInquiryRecord = {
  id: string;
  trainer_profile_id: string;
  service_interest: string | null;
  goal: string;
  preferred_service_mode: string | null;
  start_timeline: string | null;
  message: string | null;
  status: InquiryStatus;
  created_at: string;
};

type ProfessionalInquiriesPanelProps = {
  mode?: "sent" | "received";
};

function formatModeLabel(value: string | null) {
  return value ? value.replaceAll("_", " ") : null;
}

function formatStatusLabel(value: InquiryStatus) {
  switch (value) {
    case "new":
      return "New";
    case "viewed":
      return "Viewed";
    case "contacted":
      return "Contacted";
    case "closed":
      return "Closed";
    default:
      return value;
  }
}

function formatTimelineLabel(value: string | null) {
  return value ? getPreferenceLabel(CLIENT_TIMELINE_OPTIONS, value) || value.replaceAll("_", " ") : null;
}

export function ProfessionalInquiriesPanel({ mode = "sent" }: ProfessionalInquiriesPanelProps) {
  const { user, appUser, isLoading, isConfigured, professionalProfile } = useMarketplaceAccountState();
  const [snapshot, setSnapshot] = useState<MarketplaceSnapshot | null>(null);
  const [receivedInquiries, setReceivedInquiries] = useState<ReceivedInquiryRecord[]>([]);
  const [sentInquiries, setSentInquiries] = useState<SentInquiryRecord[]>([]);
  const [loadedActivityKey, setLoadedActivityKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (mode !== "sent") {
      return;
    }

    fetch("/marketplace-data.json")
      .then((response) => response.json())
      .then((data: MarketplaceSnapshot) => setSnapshot(data))
      .catch(() => setSnapshot({ generatedAt: null, categories: [], professionals: [] }));
  }, [mode]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !appUser) {
      return;
    }

    const marketplaceClient = supabase;
    let isMounted = true;

    async function loadInquiries() {
      if (mode === "sent") {
        const { data } = await marketplaceClient
          .from("trainer_profile_inquiries")
          .select(
            "id,trainer_profile_id,service_interest,goal,preferred_service_mode,start_timeline,message,status,created_at",
          )
          .eq("client_user_id", appUser!.id)
          .order("created_at", { ascending: false });

        if (isMounted) {
          setSentInquiries((data as SentInquiryRecord[]) ?? []);
          setLoadedActivityKey(`sent:${appUser!.id}`);
        }
        return;
      }

      if (!professionalProfile) {
        if (isMounted) {
          setReceivedInquiries([]);
          setLoadedActivityKey(`received:${appUser!.id}:none`);
        }
        return;
      }

      const { data } = await marketplaceClient
        .from("trainer_profile_inquiries")
        .select(
          "id,client_first_name,service_interest,goal,preferred_service_mode,start_timeline,message,status,created_at",
        )
        .eq("trainer_profile_id", professionalProfile.id)
        .order("created_at", { ascending: false });

      if (isMounted) {
        setReceivedInquiries((data as ReceivedInquiryRecord[]) ?? []);
        setLoadedActivityKey(`received:${appUser!.id}:${professionalProfile.id}`);
      }
    }

    loadInquiries().catch(() => {
      if (isMounted) {
        setFeedback(mode === "sent" ? "We could not load your requests right now." : "We could not load client requests right now.");
        setFeedbackType("error");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [appUser, mode, professionalProfile]);

  const professionalsById = useMemo(() => {
    return new Map((snapshot?.professionals ?? []).map((professional) => [professional.id, professional]));
  }, [snapshot]);

  const expectedActivityKey = appUser
    ? mode === "sent"
      ? `sent:${appUser.id}`
      : `received:${appUser.id}:${professionalProfile?.id ?? "none"}`
    : null;
  const visibleSentInquiries = loadedActivityKey === expectedActivityKey ? sentInquiries : [];
  const visibleReceivedInquiries = loadedActivityKey === expectedActivityKey ? receivedInquiries : [];

  async function handleStatusChange(inquiryId: string, status: InquiryStatus) {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !professionalProfile) {
      return;
    }

    const { error } = await supabase
      .from("trainer_profile_inquiries")
      .update({ status })
      .eq("id", inquiryId)
      .eq("trainer_profile_id", professionalProfile.id);

    if (error) {
      setFeedback(error.message);
      setFeedbackType("error");
      return;
    }

    setReceivedInquiries((current) =>
      current.map((inquiry) => (inquiry.id === inquiryId ? { ...inquiry, status } : inquiry)),
    );
    setFeedback("Client request status updated.");
    setFeedbackType("success");
  }

  if (!isConfigured) {
    return (
      <article className="callout account-page-callout">
        <span className="meta-pill">Configuration needed</span>
        <h2>Marketplace auth is not configured yet.</h2>
        <p>Add the second Supabase public URL and anon key to enable marketplace account tools.</p>
      </article>
    );
  }

  if (isLoading) {
    return (
      <article className="callout account-page-callout">
        <span className="meta-pill">Loading</span>
        <h2>Loading your account activity.</h2>
        <p>One moment while we check your marketplace account.</p>
      </article>
    );
  }

  if (!user) {
    const redirectPath = mode === "sent" ? "/account/inquiries/" : "/account/client-requests/";

    return (
      <article className="callout account-page-callout">
        <span className="meta-pill">Sign in required</span>
        <h2>Sign in to view {mode === "sent" ? "your requests" : "client requests"}.</h2>
        <div className="button-row">
          <Link className="button button-primary" href={`/sign-in/?redirect=${redirectPath}`}>
            Sign in
          </Link>
        </div>
      </article>
    );
  }

  if (mode === "received" && !professionalProfile) {
    return (
      <section className="section">
        <article className="callout">
          <span className="meta-pill">For professionals</span>
          <h2>Join Elevare as a Pro to receive client requests.</h2>
          <p>Create and submit your Pro Profile before it can appear publicly in marketplace search.</p>
          <div className="button-row">
            <Link className="button button-secondary" href="/account/professional-profile/">
              Join as a Pro
            </Link>
          </div>
        </article>
      </section>
    );
  }

  if (mode === "sent") {
    return (
      <section className="section">
        <div className="section-head">
          <div className="eyebrow">My Requests</div>
          <h2 className="section-title">Consultation requests you&apos;ve sent.</h2>
          <p className="section-copy">Review your outreach and the current status of each request.</p>
        </div>

        {visibleSentInquiries.length > 0 ? (
          <div className="account-list">
            {visibleSentInquiries.map((inquiry) => {
              const professional = professionalsById.get(inquiry.trainer_profile_id) ?? null;

              return (
                <article key={inquiry.id} className="panel account-list-card">
                  <span className="meta-pill">{new Date(inquiry.created_at).toLocaleDateString()}</span>
                  <h3>{professional?.displayName ?? "Professional profile"}</h3>
                  <p>
                    {professional?.professionalTitle
                      ?? (professional
                        ? formatCategoryList(professional.categories)
                        : "This request is tied to a professional profile.")}
                  </p>
                  <ul>
                    <li>
                      <strong>Status:</strong> {formatStatusLabel(inquiry.status)}
                    </li>
                    <li>
                      <strong>Goal:</strong> {inquiry.goal}
                    </li>
                    {inquiry.service_interest ? (
                      <li>
                        <strong>Service:</strong> {inquiry.service_interest}
                      </li>
                    ) : null}
                    {inquiry.preferred_service_mode ? (
                      <li>
                        <strong>Preferred mode:</strong> {formatModeLabel(inquiry.preferred_service_mode)}
                      </li>
                    ) : null}
                    {inquiry.start_timeline ? (
                      <li>
                        <strong>Start timeline:</strong> {formatTimelineLabel(inquiry.start_timeline)}
                      </li>
                    ) : null}
                    {inquiry.message ? (
                      <li>
                        <strong>Message:</strong> {inquiry.message}
                      </li>
                    ) : null}
                  </ul>
                  {professional ? (
                    <div className="button-row">
                      <Link className="button button-secondary" href={buildProfessionalPath(professional.profileSlug)}>
                        View profile
                      </Link>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <article className="callout">
            <span className="meta-pill">No requests yet</span>
            <h2>You have not sent any consultation requests yet.</h2>
            <p>Browse Elevare and reach out when you find someone who looks like a strong fit.</p>
            <div className="button-row">
              <Link className="button button-primary" href="/professionals/">
                Explore Elevare
              </Link>
            </div>
          </article>
        )}

        {feedback ? (
          <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`}>{feedback}</div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">Client Requests</div>
        <h2 className="section-title">Consultation requests sent to your Pro Profile.</h2>
        <p className="section-copy">Review potential client needs and keep each inquiry status current.</p>
      </div>

      {visibleReceivedInquiries.length > 0 ? (
        <div className="account-list">
          {visibleReceivedInquiries.map((inquiry) => (
            <article key={inquiry.id} className="panel account-list-card">
              <span className="meta-pill">{new Date(inquiry.created_at).toLocaleDateString()}</span>
              <h3>{inquiry.client_first_name || "Potential client"}</h3>
              <p>{inquiry.goal}</p>
              <ul>
                {inquiry.service_interest ? (
                  <li>
                    <strong>Service:</strong> {inquiry.service_interest}
                  </li>
                ) : null}
                {inquiry.preferred_service_mode ? (
                  <li>
                    <strong>Mode:</strong> {formatModeLabel(inquiry.preferred_service_mode)}
                  </li>
                ) : null}
                {inquiry.start_timeline ? (
                  <li>
                    <strong>Start timeline:</strong> {formatTimelineLabel(inquiry.start_timeline)}
                  </li>
                ) : null}
                {inquiry.message ? (
                  <li>
                    <strong>Message:</strong> {inquiry.message}
                  </li>
                ) : null}
              </ul>
              <label className="field">
                <span className="field-label">Status</span>
                <select
                  value={inquiry.status}
                  onChange={(event) => handleStatusChange(inquiry.id, event.target.value as InquiryStatus)}
                >
                  <option value="new">New</option>
                  <option value="viewed">Viewed</option>
                  <option value="contacted">Contacted</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            </article>
          ))}
        </div>
      ) : (
        <article className="callout">
          <span className="meta-pill">Ready for client requests</span>
          <h2>No consultation requests have come in yet.</h2>
          <p>New inquiries will appear here when potential clients contact you through your Pro Profile.</p>
          <div className="button-row">
            <Link className="button button-secondary" href="/account/professional-profile/">
              Review Pro Profile
            </Link>
          </div>
        </article>
      )}

      {feedback ? (
        <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`}>{feedback}</div>
      ) : null}
    </section>
  );
}
