"use client";

import { useEffect } from "react";
import {
  ANALYTICS_CONSENT_CHANGE_EVENT,
  hasAnalyticsConsent,
} from "@/lib/analytics-consent";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const STORAGE_KEY_PREFIX = "elevare:professional-profile-view:";

function utcDateKey() {
  return new Date().toISOString().slice(0, 10);
}

export function ProfessionalProfileViewTracker({ professionalId }: { professionalId: string }) {
  useEffect(() => {
    let active = true;

    async function recordView() {
      if (!active || !hasAnalyticsConsent()) return;
      const storageKey = `${STORAGE_KEY_PREFIX}${professionalId}:${utcDateKey()}`;

      try {
        if (window.localStorage.getItem(storageKey)) return;
        window.localStorage.setItem(storageKey, "pending");
      } catch {
        // The server-side privacy key still provides daily deduplication.
      }

      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      const accessToken = sessionData.session?.access_token;

      try {
        const response = await fetch("/api/professional-profile-view/", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-elevare-analytics-consent": "accepted",
            ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ professionalId }),
          credentials: "same-origin",
          keepalive: true,
        });

        if (!response.ok) throw new Error("Profile view was not recorded.");
        try {
          window.localStorage.setItem(storageKey, "recorded");
        } catch {
          // Tracking remains deduplicated by the server when storage is unavailable.
        }
      } catch {
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // A future visit can retry when storage is available again.
        }
      }
    }

    function handleConsentChange(event: Event) {
      if ((event as CustomEvent<string>).detail === "accepted") void recordView();
    }

    void recordView();
    window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, handleConsentChange);
    return () => {
      active = false;
      window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, handleConsentChange);
    };
  }, [professionalId]);

  return null;
}
