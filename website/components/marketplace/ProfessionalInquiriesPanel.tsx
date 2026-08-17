"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { getMarketplaceAppUserByAuthId } from "@/lib/marketplace-account";
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
  message: string | null;
  status: InquiryStatus;
  created_at: string;
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

export function ProfessionalInquiriesPanel() {
  const { user, isLoading, isConfigured } = useSupabaseSession();
  const [snapshot, setSnapshot] = useState<MarketplaceSnapshot | null>(null);
  const [professionalProfileId, setProfessionalProfileId] = useState<string | null>(null);
  const [receivedInquiries, setReceivedInquiries] = useState<ReceivedInquiryRecord[]>([]);
  const [sentInquiries, setSentInquiries] = useState<SentInquiryRecord[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  useEffect(() => {
    fetch("/marketplace-data.json")
      .then((response) => response.json())
      .then((data: MarketplaceSnapshot) => setSnapshot(data))
      .catch(() => setSnapshot({ generatedAt: null, categories: [], professionals: [] }));
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user) {
      return;
    }

    const supabaseClient = supabase;
    const currentUser = user;
    let isMounted = true;

    async function loadInquiries() {
      const appUser = await getMarketplaceAppUserByAuthId(supabaseClient, currentUser.id);

      if (!appUser) {
        if (isMounted) {
          setProfessionalProfileId(null);
          setReceivedInquiries([]);
          setSentInquiries([]);
        }
        return;
      }

      const [professionalProfileResult, sentInquiryResult] = await Promise.all([
        supabaseClient.from("trainer_profiles").select("id").eq("user_id", appUser.id).maybeSingle(),
        supabaseClient
          .from("trainer_profile_inquiries")
          .select("id,trainer_profile_id,service_interest,goal,preferred_service_mode,message,status,created_at")
          .eq("client_user_id", appUser.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!isMounted) {
        return;
      }

      const nextProfessionalProfileId = professionalProfileResult.data?.id ?? null;
      setProfessionalProfileId(nextProfessionalProfileId);
      setSentInquiries((sentInquiryResult.data as SentInquiryRecord[]) ?? []);

      if (!nextProfessionalProfileId) {
        setReceivedInquiries([]);
        return;
      }

      const { data: receivedInquiryData } = await supabaseClient
        .from("trainer_profile_inquiries")
        .select("id,client_first_name,service_interest,goal,preferred_service_mode,message,status,created_at")
        .eq("trainer_profile_id", nextProfessionalProfileId)
        .order("created_at", { ascending: false });

      if (isMounted) {
        setReceivedInquiries((receivedInquiryData as ReceivedInquiryRecord[]) ?? []);
      }
    }

    loadInquiries().catch(() => {
      if (isMounted) {
        setFeedback("We could not load your requests right now.");
        setFeedbackType("error");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const professionalsById = useMemo(() => {
    return new Map((snapshot?.professionals ?? []).map((professional) => [professional.id, professional]));
  }, [snapshot]);

  async function handleStatusChange(inquiryId: string, status: InquiryStatus) {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !professionalProfileId) {
      return;
    }

    const { error } = await supabase
      .from("trainer_profile_inquiries")
      .update({ status })
      .eq("id", inquiryId)
      .eq("trainer_profile_id", professionalProfileId);

    if (error) {
      setFeedback(error.message);
      setFeedbackType("error");
      return;
    }

    setReceivedInquiries((current) =>
      current.map((inquiry) => (inquiry.id === inquiryId ? { ...inquiry, status } : inquiry)),
    );
    setFeedback("Inquiry status updated.");
    setFeedbackType("success");
  }

  if (!isConfigured) {
    return (
      <article className="callout">
        <span className="meta-pill">Configuration needed</span>
        <h2>Marketplace auth is not configured yet.</h2>
        <p>Add the second Supabase public URL and anon key to enable marketplace account tools.</p>
      </article>
    );
  }

  if (isLoading) {
    return (
      <article className="callout">
        <span className="meta-pill">Loading</span>
        <h2>Loading your account activity.</h2>
        <p>One moment while we check your marketplace account.</p>
      </article>
    );
  }

  if (!user) {
    return (
      <article className="callout">
        <span className="meta-pill">Sign in required</span>
        <h2>Sign in to view your requests and inquiries.</h2>
        <div className="button-row">
          <Link className="button button-primary" href="/sign-in/?redirect=/account/inquiries/">
            Sign in
          </Link>
        </div>
      </article>
    );
  }

  const hasProfessionalProfile = Boolean(professionalProfileId);
  const hasSentInquiries = sentInquiries.length > 0;
  const hasReceivedInquiries = receivedInquiries.length > 0;

  if (!hasProfessionalProfile && !hasSentInquiries) {
    return (
      <section className="section">
        <article className="callout">
          <span className="meta-pill">No activity yet</span>
          <h2>You have not sent any requests yet.</h2>
          <p>Browse profiles to send a consultation request, or create your public profile if you want to join the marketplace.</p>
          <div className="button-row">
            <Link className="button button-primary" href="/professionals/">
              Browse profiles
            </Link>
            <Link className="button button-secondary" href="/account/professional-profile/">
              Join as a Pro
            </Link>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">Consultation requests</div>
        <h2 className="section-title">Keep track of what you sent and what came in.</h2>
        <p className="section-copy">
          Review consultation requests you sent and any incoming requests tied to your public profile.
        </p>
      </div>

      {hasSentInquiries ? (
        <div className="section-head section-head-compact">
          <div className="eyebrow">Requests you sent</div>
          <h3 className="section-title section-title-compact">Your outreach history</h3>
        </div>
      ) : null}

      {hasSentInquiries ? (
        <div className="account-list">
          {sentInquiries.map((inquiry) => {
            const professional = professionalsById.get(inquiry.trainer_profile_id) ?? null;

            return (
              <article key={inquiry.id} className="panel account-list-card">
                <span className="meta-pill">{new Date(inquiry.created_at).toLocaleDateString()}</span>
                <h3>{professional?.displayName ?? "Profile"}</h3>
                <p>
                  {professional?.professionalTitle
                    ?? (professional ? formatCategoryList(professional.categories) : "This request is tied to a public profile.")}
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
          <span className="meta-pill">No sent requests</span>
          <h2>You have not sent any consultation requests yet.</h2>
          <p>Browse the marketplace and reach out when you find someone who looks like a strong fit.</p>
          <div className="button-row">
            <Link className="button button-primary" href="/professionals/">
              Browse profiles
            </Link>
          </div>
        </article>
      )}

      {hasProfessionalProfile ? (
        <>
          <div className="section-head section-head-compact">
            <div className="eyebrow">Client requests</div>
            <h3 className="section-title section-title-compact">Requests sent to your profile</h3>
          </div>

          {hasReceivedInquiries ? (
            <div className="account-list">
              {receivedInquiries.map((inquiry) => (
                <article key={inquiry.id} className="panel account-list-card">
                  <span className="meta-pill">{new Date(inquiry.created_at).toLocaleDateString()}</span>
                  <h3>{inquiry.client_first_name}</h3>
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
              <span className="meta-pill">No incoming inquiries yet</span>
              <h2>You do not have any consultation requests yet.</h2>
              <p>Your first incoming requests will appear here once people start reaching out through your public profile.</p>
            </article>
          )}
        </>
      ) : null}

      {feedback ? <div className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`}>{feedback}</div> : null}
    </section>
  );
}
