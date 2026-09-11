"use client";

import { useEffect } from "react";
import { ANALYTICS_CONSENT_CHANGE_EVENT, readAnalyticsConsentChoice } from "@/lib/analytics-consent";
import { hasBrowserPrivacySignal, normalizeProfileViewChoice, PROFILE_VIEW_CHOICE_EVENT, readProfileViewChoice } from "@/lib/profile-view-privacy";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function ProfessionalProfileViewTracker({ professionalId }: { professionalId: string }) {
  // Deduplicate only this mounted page, never a person or a later visit.
  useEffect(() => {
    let attempted = false;
    let active = true;
    let profileChoice = readProfileViewChoice();
    let analyticsChoice = readAnalyticsConsentChoice();
    const declined = () => hasBrowserPrivacySignal() || profileChoice === "declined"
      || (profileChoice !== "accepted" && analyticsChoice === "declined");

    async function recordView() {
      if (!active || attempted || document.visibilityState !== "visible" || declined()) return;
      attempted = true;
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = supabase
          ? await supabase.auth.getSession()
          : { data: { session: null } };
        // A choice made while authentication resolves must stop the pending count.
        if (!active || declined()) { attempted = false; return; }
        const accessToken = sessionData.session?.access_token;
        const sentProfileChoice = profileChoice;
        const sentAnalyticsChoice = analyticsChoice;
        const response = await fetch("/api/professional-profile-view/", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-elevare-profile-statistics": profileChoice ?? "unset",
            "x-elevare-analytics-consent": analyticsChoice ?? "unset",
            ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ professionalId }),
          credentials: "same-origin",
          referrerPolicy: "no-referrer",
          keepalive: true,
        });
        if (active && response.headers.get("x-elevare-profile-view") === "skipped") {
          attempted = false;
          if (profileChoice !== sentProfileChoice || analyticsChoice !== sentAnalyticsChoice) void recordView();
        }
      } catch { /* Best effort: retrying an ambiguous response could double-count it. */ }
    }

    function profileChanged(event: Event) {
      profileChoice = normalizeProfileViewChoice((event as CustomEvent).detail);
      if (profileChoice === "accepted") void recordView();
    }
    function analyticsChanged(event: Event) {
      analyticsChoice = normalizeProfileViewChoice((event as CustomEvent).detail);
      profileChoice = readProfileViewChoice();
      if (analyticsChoice === "accepted") void recordView();
    }
    function storageChanged() {
      profileChoice = readProfileViewChoice();
      analyticsChoice = readAnalyticsConsentChoice();
      void recordView();
    }
    const task = window.setTimeout(() => void recordView(), 0);
    document.addEventListener("visibilitychange", recordView);
    window.addEventListener(PROFILE_VIEW_CHOICE_EVENT, profileChanged);
    window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, analyticsChanged);
    window.addEventListener("storage", storageChanged);
    return () => {
      active = false;
      window.clearTimeout(task);
      document.removeEventListener("visibilitychange", recordView);
      window.removeEventListener(PROFILE_VIEW_CHOICE_EVENT, profileChanged);
      window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, analyticsChanged);
      window.removeEventListener("storage", storageChanged);
    };
  }, [professionalId]);
  return null;
}
