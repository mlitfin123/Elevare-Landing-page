"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/marketplace/SignOutButton";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { getMarketplaceAppUserByAuthId } from "@/lib/marketplace-account";
import { formatApprovalStatusLabel, getProfessionalStatusMessage } from "@/lib/marketplace-helpers";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type ProfileSummaryState = {
  hasClientProfile: boolean;
  hasProfessionalProfile: boolean;
  approvalStatus: string | null;
  reviewFeedbackPublic: string | null;
};

export function AccountDashboard() {
  const { user, isLoading, isConfigured } = useSupabaseSession();
  const [summary, setSummary] = useState<ProfileSummaryState>({
    hasClientProfile: false,
    hasProfessionalProfile: false,
    approvalStatus: null,
    reviewFeedbackPublic: null,
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user) {
      return;
    }

    const marketplaceClient = supabase;
    const currentUser = user;
    let isMounted = true;

    async function loadSummary() {
      try {
        const appUser = await getMarketplaceAppUserByAuthId(marketplaceClient, currentUser.id);

        if (!appUser) {
          if (isMounted) {
            setSummary({
              hasClientProfile: false,
              hasProfessionalProfile: false,
              approvalStatus: null,
              reviewFeedbackPublic: null,
            });
          }
          return;
        }

        const [clientProfileResult, professionalProfileResult] = await Promise.all([
          marketplaceClient.from("client_profiles").select("id").eq("user_id", appUser.id).maybeSingle(),
          marketplaceClient
            .from("marketplace_trainer_profile_status_v1")
            .select("trainer_profile_id,marketplace_status,review_feedback_public")
            .eq("user_id", appUser.id)
            .maybeSingle(),
        ]);

        if (isMounted) {
          setSummary({
            hasClientProfile: Boolean(clientProfileResult.data?.id),
            hasProfessionalProfile: Boolean(professionalProfileResult.data?.trainer_profile_id),
            approvalStatus: professionalProfileResult.data?.marketplace_status ?? null,
            reviewFeedbackPublic: professionalProfileResult.data?.review_feedback_public ?? null,
          });
        }
      } catch {
        if (isMounted) {
          setSummary({
            hasClientProfile: false,
            hasProfessionalProfile: false,
            approvalStatus: null,
            reviewFeedbackPublic: null,
          });
        }
      }
    }

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!isConfigured) {
    return (
      <article className="callout">
        <span className="meta-pill">Configuration needed</span>
        <h2>Marketplace auth is not configured yet.</h2>
        <p>Add the second Supabase public URL and anon key to enable sign-in and account features.</p>
      </article>
    );
  }

  if (isLoading) {
    return (
      <article className="callout">
        <span className="meta-pill">Loading</span>
        <h2>Checking your account.</h2>
        <p>One moment while we load your marketplace access.</p>
      </article>
    );
  }

  if (!user) {
    return (
      <article className="callout">
        <span className="meta-pill">Sign in required</span>
        <h2>Sign in to access your account.</h2>
        <p>Use your account to save profiles, send requests, and manage your client or public profile.</p>
        <div className="button-row">
          <Link className="button button-primary" href="/sign-in/">
            Sign in
          </Link>
        </div>
      </article>
    );
  }

  const professionalStatusMessage = getProfessionalStatusMessage(
    summary.approvalStatus,
    summary.reviewFeedbackPublic,
  );

  return (
    <>
      <section className="section">
        <article className="panel">
          <span className="meta-pill">Signed in</span>
          <h2>{user.email}</h2>
          <p>
            Use your account to manage private client preferences, saved profiles, your public profile, and
            incoming consultation requests.
          </p>
          <div className="button-row">
            <SignOutButton />
          </div>
        </article>
      </section>

      <section className="section">
        <div className="grid-3 account-grid">
          <article className="panel">
            <span className="stat-label">{summary.hasClientProfile ? "Set up" : "Start here"}</span>
            <h3>Private client profile</h3>
            <p>Save your preferences so consultation requests are easier to send and update later.</p>
            <div className="button-row">
              <Link className="button button-secondary" href="/account/profile/">
                {summary.hasClientProfile ? "Edit client profile" : "Create client profile"}
              </Link>
            </div>
          </article>

          <article className="panel">
            <span className="stat-label">{summary.hasProfessionalProfile ? "Live workflow" : "For pros"}</span>
            <h3>Public profile</h3>
            <p>Build your public listing, add services and credentials, and submit it for approval.</p>
            <div className="form-note account-status-note">
              {summary.hasProfessionalProfile
                ? `Current status: ${formatApprovalStatusLabel(summary.approvalStatus)}. ${professionalStatusMessage}`
                : "No public profile created yet."}
            </div>
            <div className="button-row">
              <Link className="button button-secondary" href="/account/professional-profile/">
                {summary.hasProfessionalProfile ? "Manage your profile" : "Join as a Pro"}
              </Link>
            </div>
          </article>

          <article className="panel">
            <span className="stat-label">Directory actions</span>
            <h3>Saved profiles and requests</h3>
            <p>Review saved profiles, see requests you sent, and manage any incoming inquiries tied to your public profile.</p>
            <div className="button-row">
              <Link className="button button-secondary" href="/account/saved/">
                Saved profiles
              </Link>
              <Link className="button button-secondary" href="/account/inquiries/">
                Requests
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
