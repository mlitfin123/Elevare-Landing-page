"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AccountDeletionRequest } from "@/components/marketplace/AccountDeletionRequest";
import { useMarketplaceAccountState } from "@/components/marketplace/MarketplaceAccountShell";
import {
  buildProfessionalPath,
  formatApprovalStatusLabel,
  getProfessionalStatusMessage,
} from "@/lib/marketplace-helpers";
import type { MarketplaceSnapshot, ProfessionalProfileRecord } from "@/lib/marketplace-types";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type SavedActivityRecord = {
  id: string;
  trainer_profile_id: string;
  created_at: string;
};

type RequestActivityRecord = {
  id: string;
  trainer_profile_id: string;
  client_first_name?: string | null;
  service_interest: string | null;
  goal: string;
  status: "new" | "viewed" | "contacted" | "closed";
  created_at: string;
};

function formatRequestStatus(status: RequestActivityRecord["status"]) {
  switch (status) {
    case "new":
      return "Sent";
    case "viewed":
      return "Viewed";
    case "contacted":
      return "Contacted";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

function formatIncomingRequestStatus(status: RequestActivityRecord["status"]) {
  return status === "new" ? "New" : formatRequestStatus(status);
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

export function AccountDashboard() {
  const {
    user,
    appUser,
    isLoading,
    isConfigured,
    hasClientProfile,
    professionalProfile,
  } = useMarketplaceAccountState();
  const [snapshot, setSnapshot] = useState<MarketplaceSnapshot | null>(null);
  const [savedRecords, setSavedRecords] = useState<SavedActivityRecord[]>([]);
  const [sentRequests, setSentRequests] = useState<RequestActivityRecord[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<RequestActivityRecord[]>([]);
  const [activityOwnerId, setActivityOwnerId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/marketplace-data.json")
      .then((response) => response.json())
      .then((data: MarketplaceSnapshot) => setSnapshot(data))
      .catch(() => setSnapshot({ generatedAt: null, categories: [], professionals: [] }));
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !appUser) {
      return;
    }

    const marketplaceClient = supabase;
    let isMounted = true;

    async function loadActivity() {
      const activityQueries = [
        marketplaceClient
          .from("saved_trainer_profiles")
          .select("id,trainer_profile_id,created_at")
          .eq("client_user_id", appUser!.id)
          .order("created_at", { ascending: false })
          .limit(3),
        marketplaceClient
          .from("trainer_profile_inquiries")
          .select("id,trainer_profile_id,service_interest,goal,status,created_at")
          .eq("client_user_id", appUser!.id)
          .order("created_at", { ascending: false })
          .limit(3),
      ] as const;

      const [savedResult, sentResult] = await Promise.all(activityQueries);

      let incomingData: RequestActivityRecord[] = [];

      if (professionalProfile) {
        const incomingResult = await marketplaceClient
          .from("trainer_profile_inquiries")
          .select("id,trainer_profile_id,client_first_name,service_interest,goal,status,created_at")
          .eq("trainer_profile_id", professionalProfile.id)
          .order("created_at", { ascending: false })
          .limit(3);

        incomingData = (incomingResult.data as RequestActivityRecord[]) ?? [];
      }

      if (isMounted) {
        setSavedRecords((savedResult.data as SavedActivityRecord[]) ?? []);
        setSentRequests((sentResult.data as RequestActivityRecord[]) ?? []);
        setReceivedRequests(incomingData);
        setActivityOwnerId(appUser!.id);
      }
    }

    loadActivity().catch(() => {
      if (isMounted) {
        setSavedRecords([]);
        setSentRequests([]);
        setReceivedRequests([]);
        setActivityOwnerId(appUser!.id);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [appUser, professionalProfile]);

  const professionalsById = useMemo(
    () => new Map((snapshot?.professionals ?? []).map((professional) => [professional.id, professional])),
    [snapshot],
  );

  const hasCurrentActivity = Boolean(appUser && activityOwnerId === appUser.id);
  const visibleSentRequests = hasCurrentActivity ? sentRequests : [];
  const visibleReceivedRequests = hasCurrentActivity ? receivedRequests : [];

  const recentlySaved = useMemo(
    () =>
      (hasCurrentActivity ? savedRecords : [])
        .map((record) => professionalsById.get(record.trainer_profile_id) ?? null)
        .filter((professional): professional is ProfessionalProfileRecord => Boolean(professional)),
    [hasCurrentActivity, professionalsById, savedRecords],
  );

  if (!isConfigured) {
    return (
      <article className="callout account-page-callout">
        <span className="meta-pill">Configuration needed</span>
        <h2>Marketplace auth is not configured yet.</h2>
        <p>Add the second Supabase public URL and anon key to enable sign-in and account features.</p>
      </article>
    );
  }

  if (isLoading) {
    return (
      <article className="callout account-page-callout">
        <span className="meta-pill">Loading</span>
        <h2>Checking your account.</h2>
        <p>One moment while we load your marketplace access.</p>
      </article>
    );
  }

  if (!user) {
    return (
      <article className="callout account-page-callout">
        <span className="meta-pill">Sign in required</span>
        <h2>Sign in to access your account.</h2>
        <p>Use your account to save profiles, send consultation requests, and manage your preferences.</p>
        <div className="button-row">
          <Link className="button button-primary" href="/sign-in/">
            Sign in
          </Link>
        </div>
      </article>
    );
  }

  const welcomeName = appUser?.first_name?.trim() || null;
  const professionalStatusMessage = professionalProfile
    ? professionalProfile.statusMessage
      ?? getProfessionalStatusMessage(professionalProfile.status, professionalProfile.reviewFeedbackPublic)
    : null;

  return (
    <>
      {welcomeName ? (
        <section className="account-welcome" aria-label="Account welcome">
          <h2>Welcome back, {welcomeName}</h2>
        </section>
      ) : null}

      <section className="section account-overview-section" aria-labelledby="account-actions-heading">
        <div className="section-head section-head-compact">
          <div className="eyebrow">Your next step</div>
          <h2 id="account-actions-heading" className="section-title section-title-compact">
            What would you like to do?
          </h2>
        </div>

        <div className="grid-3 account-grid">
          <article className="panel account-action-card">
            <span className="stat-label">Find support</span>
            <h3>Explore Elevare</h3>
            <p>Browse trainers, coaches, nutrition, wellness, and other services on Elevare.</p>
            <div className="button-row">
              <Link className="button button-primary" href="/professionals/">
                Explore Elevare
              </Link>
            </div>
          </article>

          <article className="panel account-action-card">
            <span className="stat-label">Your preferences</span>
            <h3>{hasClientProfile ? "Refine your preferences" : "Tell us what you need"}</h3>
            <p>Tell Elevare what you&apos;re looking for to improve your marketplace results and consultation requests.</p>
            <div className="button-row">
              <Link className="button button-secondary" href="/account/profile/">
                {hasClientProfile ? "Edit Preferences" : "Set Preferences"}
              </Link>
            </div>
          </article>

          <article className="panel account-action-card">
            <span className="stat-label">Saved &amp; requests</span>
            <h3>Keep track of your search</h3>
            <p>Return to saved profiles and keep track of consultation requests you&apos;ve sent.</p>
            <div className="button-row">
              <Link className="button button-secondary" href="/account/saved/">
                View Saved
              </Link>
              <Link className="button button-secondary" href="/account/inquiries/">
                View My Requests
              </Link>
            </div>
          </article>
        </div>
      </section>

      {recentlySaved.length > 0 || visibleSentRequests.length > 0 ? (
        <section className="section account-overview-section" aria-labelledby="recent-activity-heading">
          <div className="section-head section-head-compact">
            <div className="eyebrow">Your activity</div>
            <h2 id="recent-activity-heading" className="section-title section-title-compact">
              Pick up where you left off.
            </h2>
          </div>

          <div className="account-summary-grid">
            {recentlySaved.length > 0 ? (
              <article className="panel account-summary-card">
                <div className="account-summary-head">
                  <h3>Recently Saved</h3>
                  <Link className="hero-text-link" href="/account/saved/">
                    View All Saved
                  </Link>
                </div>
                <div className="account-activity-list">
                  {recentlySaved.map((professional) => (
                    <Link
                      key={professional.id}
                      className="account-activity-row"
                      href={buildProfessionalPath(professional.profileSlug)}
                    >
                      <span>
                        <strong>{professional.displayName}</strong>
                        <small>{professional.professionalTitle}</small>
                      </span>
                      <span aria-hidden="true">View</span>
                    </Link>
                  ))}
                </div>
              </article>
            ) : null}

            {visibleSentRequests.length > 0 ? (
              <article className="panel account-summary-card">
                <div className="account-summary-head">
                  <h3>Recent Requests</h3>
                  <Link className="hero-text-link" href="/account/inquiries/">
                    View My Requests
                  </Link>
                </div>
                <div className="account-activity-list">
                  {visibleSentRequests.map((request) => {
                    const professional = professionalsById.get(request.trainer_profile_id);

                    return (
                      <div key={request.id} className="account-activity-row is-static">
                        <span>
                          <strong>{professional?.displayName ?? "Professional profile"}</strong>
                          <small>Sent {formatActivityDate(request.created_at)}</small>
                        </span>
                        <span className="meta-pill">{formatRequestStatus(request.status)}</span>
                      </div>
                    );
                  })}
                </div>
              </article>
            ) : null}
          </div>
        </section>
      ) : null}

      {professionalProfile ? (
        <section className="section account-overview-section" aria-labelledby="pro-overview-heading">
          <div className="section-head section-head-compact">
            <div className="eyebrow">Pro activity</div>
            <h2 id="pro-overview-heading" className="section-title section-title-compact">
              Your services on Elevare.
            </h2>
          </div>

          <div className="account-summary-grid">
            <article className="panel account-summary-card">
              <div className="account-summary-head">
                <div>
                  <span className="stat-label">Your Pro Profile</span>
                  <h3>{professionalProfile.isPubliclyListed ? "Live on Elevare" : "Profile status"}</h3>
                </div>
                <span className="meta-pill">
                  {professionalProfile.isPubliclyListed
                    ? "Live"
                    : formatApprovalStatusLabel(professionalProfile.status)}
                </span>
              </div>
              <p>{professionalStatusMessage}</p>
              <div className="button-row">
                <Link className="button button-secondary" href="/account/professional-profile/">
                  {professionalProfile.status === "draft" || professionalProfile.status === "rejected"
                    ? "Complete Pro Profile"
                    : "Edit Pro Profile"}
                </Link>
                {professionalProfile.isPubliclyListed && professionalProfile.publicSlug ? (
                  <Link className="button button-primary" href={buildProfessionalPath(professionalProfile.publicSlug)}>
                    View Public Profile
                  </Link>
                ) : null}
              </div>
            </article>

            {visibleReceivedRequests.length > 0 ? (
              <article className="panel account-summary-card">
                <div className="account-summary-head">
                  <div>
                    <span className="stat-label">Client requests</span>
                    <h3>Recent inquiries</h3>
                  </div>
                  <Link className="hero-text-link" href="/account/client-requests/">
                    View Client Requests
                  </Link>
                </div>
                <div className="account-activity-list">
                  {visibleReceivedRequests.map((request) => (
                    <div key={request.id} className="account-activity-row is-static">
                      <span>
                        <strong>{request.client_first_name || "Potential client"}</strong>
                        <small>{request.service_interest || request.goal}</small>
                      </span>
                      <span className="meta-pill">{formatIncomingRequestStatus(request.status)}</span>
                    </div>
                  ))}
                </div>
              </article>
            ) : professionalProfile.isPubliclyListed ? (
              <article className="panel account-summary-card account-empty-summary">
                <span className="stat-label">Client requests</span>
                <h3>Your profile is ready for inquiries.</h3>
                <p>Consultation requests will appear here when potential clients contact you through your profile.</p>
                <div className="button-row">
                  <Link className="button button-secondary" href="/account/client-requests/">
                    View Client Requests
                  </Link>
                </div>
              </article>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="section account-overview-section">
          <article className="callout account-pro-cta">
            <div>
              <span className="meta-pill">For professionals</span>
              <h2>Offer services on Elevare?</h2>
              <p>Create a public Elevare profile, list your services, and connect with potential clients.</p>
            </div>
            <div className="button-row">
              <Link className="button button-secondary" href="/account/professional-profile/">
                Join as a Pro
              </Link>
            </div>
          </article>
        </section>
      )}

      <section className="section account-overview-section" aria-labelledby="account-management-heading">
        <article className="panel account-management-card">
          <div>
            <span className="stat-label">Account management</span>
            <h2 id="account-management-heading">Account deletion</h2>
            <p>
              Submit a request if you want Elevare to permanently delete your account and associated profile data.
            </p>
          </div>
          <AccountDeletionRequest />
        </article>
      </section>
    </>
  );
}
