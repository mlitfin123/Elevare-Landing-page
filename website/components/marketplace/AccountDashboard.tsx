"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { AccountDeletionRequest } from "@/components/marketplace/AccountDeletionRequest";
import { useMarketplaceAccountState } from "@/components/marketplace/MarketplaceAccountShell";
import {
  getDashboardActionOrder,
  getDashboardSectionOrder,
  getProfessionalDashboardPresentation,
  type DashboardActionId,
} from "@/lib/dashboard-state";
import {
  buildProfessionalPath,
  formatLocationLabel,
  getProfessionalStatusMessage,
} from "@/lib/marketplace-helpers";
import {
  EMPTY_MARKETPLACE_SNAPSHOT,
  type MarketplaceSnapshot,
  type ProfessionalProfileRecord,
} from "@/lib/marketplace-types";
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

type ActivityErrors = {
  directory: boolean;
  saved: boolean;
  outgoing: boolean;
  incoming: boolean;
};

const EMPTY_ACTIVITY_ERRORS: ActivityErrors = {
  directory: false,
  saved: false,
  outgoing: false,
  incoming: false,
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

function ActivityLoadErrorCard({ label, onRetry }: Readonly<{ label: string; onRetry: () => void }>) {
  return (
    <article className="panel account-summary-card account-activity-error">
      <span className="stat-label">Unable to load</span>
      <h3>{label}</h3>
      <p>That part of your account could not be loaded right now. Your other account data is still available.</p>
      <div className="button-row">
        <button type="button" className="button button-secondary" onClick={onRetry}>
          Try Again
        </button>
      </div>
    </article>
  );
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
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [activityErrors, setActivityErrors] = useState<ActivityErrors>(EMPTY_ACTIVITY_ERRORS);
  const [activityLoadAttempt, setActivityLoadAttempt] = useState(0);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!appUser) {
      return;
    }

    const currentAppUser = appUser;
    const marketplaceClient = supabase;
    let isMounted = true;

    async function loadActivity() {
      setIsActivityLoading(true);
      setActivityOwnerId(null);
      setActivityErrors(EMPTY_ACTIVITY_ERRORS);

      if (!marketplaceClient) {
        if (isMounted) {
          setSnapshot(EMPTY_MARKETPLACE_SNAPSHOT);
          setSavedRecords([]);
          setSentRequests([]);
          setReceivedRequests([]);
          setActivityOwnerId(currentAppUser.id);
          setActivityErrors({ directory: true, saved: true, outgoing: true, incoming: Boolean(professionalProfile) });
          setIsActivityLoading(false);
        }
        return;
      }

      const directoryRequest = fetch("/marketplace-data.json")
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Marketplace directory request failed.");
          }

          return (await response.json()) as MarketplaceSnapshot;
        })
        .then((data) => ({ data, error: false }))
        .catch(() => ({ data: EMPTY_MARKETPLACE_SNAPSHOT, error: true }));

      const savedRequest = marketplaceClient
        .from("saved_trainer_profiles")
        .select("id,trainer_profile_id,created_at")
        .eq("client_user_id", currentAppUser.id)
        .order("created_at", { ascending: false })
        .limit(3);

      const outgoingRequest = marketplaceClient
        .from("trainer_profile_inquiries")
        .select("id,trainer_profile_id,service_interest,goal,status,created_at")
        .eq("client_user_id", currentAppUser.id)
        .order("created_at", { ascending: false })
        .limit(3);

      const incomingRequest = professionalProfile
        ? marketplaceClient
            .from("trainer_profile_inquiries")
            .select("id,trainer_profile_id,client_first_name,service_interest,goal,status,created_at")
            .eq("trainer_profile_id", professionalProfile.id)
            .order("created_at", { ascending: false })
            .limit(3)
        : Promise.resolve({ data: [] as RequestActivityRecord[], error: null });

      const [directoryResult, savedResult, outgoingResult, incomingResult] = await Promise.all([
        directoryRequest,
        savedRequest,
        outgoingRequest,
        incomingRequest,
      ]);

      if (isMounted) {
        setSnapshot(directoryResult.data);
        setSavedRecords((savedResult.data as SavedActivityRecord[]) ?? []);
        setSentRequests((outgoingResult.data as RequestActivityRecord[]) ?? []);
        setReceivedRequests((incomingResult.data as RequestActivityRecord[]) ?? []);
        setActivityOwnerId(currentAppUser.id);
        setActivityErrors({
          directory: directoryResult.error,
          saved: Boolean(savedResult.error),
          outgoing: Boolean(outgoingResult.error),
          incoming: Boolean(incomingResult.error),
        });
        setIsActivityLoading(false);
      }
    }

    loadActivity().catch(() => {
      if (isMounted) {
        setSnapshot(EMPTY_MARKETPLACE_SNAPSHOT);
        setSavedRecords([]);
        setSentRequests([]);
        setReceivedRequests([]);
        setActivityOwnerId(currentAppUser.id);
        setActivityErrors({ directory: true, saved: true, outgoing: true, incoming: Boolean(professionalProfile) });
        setIsActivityLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activityLoadAttempt, appUser, professionalProfile]);

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

  if (isActivityLoading) {
    return (
      <article className="callout account-page-callout account-dashboard-loading" aria-live="polite">
        <span className="meta-pill">Loading</span>
        <h2>Loading your dashboard.</h2>
        <p>We&apos;re gathering your latest marketplace activity.</p>
      </article>
    );
  }

  const welcomeName = appUser?.first_name?.trim() || null;
  const professionalStatusMessage = professionalProfile
    ? professionalProfile.statusMessage
      ?? getProfessionalStatusMessage(professionalProfile.status, professionalProfile.reviewFeedbackPublic)
    : null;

  const professionalPresentation = professionalProfile
    ? getProfessionalDashboardPresentation({
        status: professionalProfile.status,
        isPubliclyListed: professionalProfile.isPubliclyListed,
      })
    : null;
  const hasRecentSaved = recentlySaved.length > 0;
  const hasRecentOutgoingRequests = visibleSentRequests.length > 0;
  const hasClientActivity = hasRecentSaved || hasRecentOutgoingRequests;
  const hasDirectoryDetailError = activityErrors.directory && (savedRecords.length > 0 || sentRequests.length > 0);
  const hasClientActivityErrors = activityErrors.saved || activityErrors.outgoing || hasDirectoryDetailError;
  const showActivitySection = hasClientActivity || hasClientActivityErrors;
  const showClientRequestsSection = Boolean(
    professionalProfile
      && (visibleReceivedRequests.length > 0 || activityErrors.incoming || professionalProfile.isPubliclyListed),
  );
  const actionOrder = getDashboardActionOrder({
    hasClientActivity,
    hasProfessionalProfile: Boolean(professionalProfile),
    hasRecentSaved,
    hasRecentOutgoingRequests,
  });
  const sectionOrder = getDashboardSectionOrder({
    hasClientActivity: showActivitySection,
    hasProfessionalProfile: Boolean(professionalProfile),
    showClientRequests: showClientRequestsSection,
  });

  function retryActivity() {
    setActivityLoadAttempt((current) => current + 1);
  }

  function renderActionCard(action: DashboardActionId) {
    switch (action) {
      case "preferences":
        return (
          <article className="panel account-action-card">
            <span className="stat-label">Your preferences</span>
            <h3>{hasClientProfile ? "Your preferences" : "Tell us what you need"}</h3>
            <p>
              {hasClientProfile
                ? "Keep your goals and marketplace preferences up to date."
                : "Tell Elevare what you're looking for to improve your marketplace results and consultation requests."}
            </p>
            <div className="button-row">
              <Link className="button button-secondary" href="/account/profile/">
                {hasClientProfile ? "Edit Preferences" : "Set Preferences"}
              </Link>
            </div>
          </article>
        );
      case "saved_requests":
        return (
          <article className="panel account-action-card">
            <span className="stat-label">Saved &amp; requests</span>
            <h3>Pick up where you left off</h3>
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
        );
      case "explore":
      default:
        return (
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
        );
    }
  }

  const activitySection = showActivitySection ? (
    <section className="section account-overview-section" aria-labelledby="recent-activity-heading">
      <div className="section-head section-head-compact">
        <div className="eyebrow">Your activity</div>
        <h2 id="recent-activity-heading" className="section-title section-title-compact">
          Pick up where you left off.
        </h2>
      </div>

      <div className="account-summary-grid">
        {hasRecentSaved ? (
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
                    <small>{formatLocationLabel(professional)}</small>
                  </span>
                  <span aria-hidden="true">View</span>
                </Link>
              ))}
            </div>
          </article>
        ) : activityErrors.saved ? (
          <ActivityLoadErrorCard label="Saved profiles" onRetry={retryActivity} />
        ) : null}

        {hasRecentOutgoingRequests ? (
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
                      <small>{professional?.professionalTitle ?? request.service_interest ?? "Consultation request"}</small>
                      <small>Sent {formatActivityDate(request.created_at)}</small>
                    </span>
                    <span className="meta-pill">{formatRequestStatus(request.status)}</span>
                  </div>
                );
              })}
            </div>
          </article>
        ) : activityErrors.outgoing ? (
          <ActivityLoadErrorCard label="Recent requests" onRetry={retryActivity} />
        ) : null}

        {hasDirectoryDetailError ? (
          <ActivityLoadErrorCard label="Some profile details" onRetry={retryActivity} />
        ) : null}
      </div>
    </section>
  ) : null;

  const actionSection = (
    <section className="section account-overview-section" aria-labelledby="account-actions-heading">
      <div className="section-head section-head-compact">
        <div className="eyebrow">{hasClientActivity || professionalProfile ? "Account shortcuts" : "Your next step"}</div>
        <h2 id="account-actions-heading" className="section-title section-title-compact">
          What would you like to do?
        </h2>
      </div>

      <div className={`account-grid${actionOrder.length < 3 ? " is-condensed" : ""}`}>
        {actionOrder.map((action) => (
          <Fragment key={action}>{renderActionCard(action)}</Fragment>
        ))}
      </div>
    </section>
  );

  const proSection = professionalProfile && professionalPresentation ? (
    <section className="section account-overview-section" aria-labelledby="pro-overview-heading">
      <div className="section-head section-head-compact">
        <div className="eyebrow">Pro activity</div>
        <h2 id="pro-overview-heading" className="section-title section-title-compact">
          Your services on Elevare.
        </h2>
      </div>

      <div className="account-summary-grid is-single">
        <article className="panel account-summary-card">
          <div className="account-summary-head">
            <div>
              <span className="stat-label">Professional account</span>
              <h3>Your Pro Profile</h3>
            </div>
            <span className="meta-pill">{professionalPresentation.statusLabel}</span>
          </div>
          <p>{professionalStatusMessage}</p>
          <div className="button-row">
            <Link className="button button-secondary" href="/account/professional-profile/">
              {professionalPresentation.editorActionLabel}
            </Link>
            {professionalProfile.isPubliclyListed && professionalProfile.publicSlug ? (
              <Link className="button button-primary" href={buildProfessionalPath(professionalProfile.publicSlug)}>
                View Public Profile
              </Link>
            ) : null}
          </div>
        </article>

      </div>
    </section>
  ) : null;

  const clientRequestsSection = showClientRequestsSection && professionalProfile ? (
    <section className="section account-overview-section" aria-labelledby="client-requests-overview-heading">
      <div className="section-head section-head-compact">
        <div className="eyebrow">Client requests</div>
        <h2 id="client-requests-overview-heading" className="section-title section-title-compact">
          Recent inquiries.
        </h2>
      </div>

      <div className="account-summary-grid is-single">
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
                    <small>Received {formatActivityDate(request.created_at)}</small>
                  </span>
                  <span className="meta-pill">{formatIncomingRequestStatus(request.status)}</span>
                </div>
              ))}
            </div>
          </article>
        ) : activityErrors.incoming ? (
          <ActivityLoadErrorCard label="Client requests" onRetry={retryActivity} />
        ) : professionalProfile.isPubliclyListed ? (
          <article className="panel account-summary-card account-empty-summary">
            <span className="stat-label">Client requests</span>
            <h3>No client requests yet.</h3>
            <p>Keep your profile complete and up to date so clients can understand what you offer.</p>
            <div className="button-row">
              {professionalProfile.publicSlug ? (
                <Link className="button button-secondary" href={buildProfessionalPath(professionalProfile.publicSlug)}>
                  View Pro Profile
                </Link>
              ) : null}
            </div>
          </article>
        ) : null}
      </div>
    </section>
  ) : null;

  const joinProSection = !professionalProfile ? (
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
  ) : null;

  const accountManagementSection = (
    <section className="section account-overview-section" aria-labelledby="account-management-heading">
      <article className="panel account-management-card">
        <div>
          <span className="stat-label">Account management</span>
          <h2 id="account-management-heading">Account deletion</h2>
          <p>Submit a request if you want Elevare to permanently delete your account and associated profile data.</p>
        </div>
        <AccountDeletionRequest />
      </article>
    </section>
  );

  const sectionContent = {
    activity: activitySection,
    pro: proSection,
    client_requests: clientRequestsSection,
    actions: actionSection,
    join_pro: joinProSection,
    account_management: accountManagementSection,
  };

  return (
    <>
      {welcomeName ? (
        <section className="account-welcome" aria-label="Account welcome">
          <h2>Welcome back, {welcomeName}</h2>
        </section>
      ) : null}

      {sectionOrder.map((section) => (
        <Fragment key={section}>{sectionContent[section]}</Fragment>
      ))}
    </>
  );
}
