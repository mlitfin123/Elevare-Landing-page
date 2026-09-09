"use client";

import { useEffect } from "react";

const STORAGE_KEY_PREFIX = "elevare:professional-profile-view:";

export function ProfessionalProfileViewTracker({ professionalId }: { professionalId: string }) {
  useEffect(() => {
    const storageKey = `${STORAGE_KEY_PREFIX}${professionalId}`;

    try {
      if (window.sessionStorage.getItem(storageKey)) return;
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Tracking can continue when session storage is unavailable.
    }

    void fetch("/api/professional-profile-view/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ professionalId }),
      credentials: "same-origin",
      keepalive: true,
    }).then((response) => {
      if (!response.ok) {
        try {
          window.sessionStorage.removeItem(storageKey);
        } catch {
          // A future visit can retry when storage is available again.
        }
      }
    }).catch(() => {
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {
        // View tracking is non-critical and must not affect the public profile.
      }
    });
  }, [professionalId]);

  return null;
}
