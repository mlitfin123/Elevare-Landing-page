"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ANALYTICS_CONSENT_STORAGE_KEY, type AnalyticsConsentChoice } from "@/lib/analytics-consent";
import { trackPageView } from "@/lib/analytics";

type AnalyticsConsentProps = {
  measurementId: string;
};

function initializeConsentMode() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

function loadAnalytics(measurementId: string) {
  initializeConsentMode();
  window.gtag?.("consent", "update", { analytics_storage: "granted" });

  if (!document.getElementById("google-analytics-script")) {
    const script = document.createElement("script");
    script.id = "google-analytics-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  window.gtag?.("js", new Date());
  window.gtag?.("config", measurementId, { send_page_view: false });
}

function clearAnalyticsCookies() {
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (!name || !(name === "_ga" || name === "_gid" || name.startsWith("_ga_"))) return;
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.elevarefit.com; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.elevarefit.org; SameSite=Lax`;
  });
}

export function AnalyticsConsent({ measurementId }: AnalyticsConsentProps) {
  const pathname = usePathname();
  const [choice, setChoice] = useState<AnalyticsConsentChoice | null>(null);
  const [isChoosing, setIsChoosing] = useState(false);

  useEffect(() => {
    initializeConsentMode();
    const storedChoice = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    const nextChoice = storedChoice === "accepted" || storedChoice === "declined" ? storedChoice : null;
    const hydrationTask = window.setTimeout(() => {
      setChoice(nextChoice);
      setIsChoosing(nextChoice === null);
    }, 0);
    if (nextChoice === "accepted") loadAnalytics(measurementId);
    return () => window.clearTimeout(hydrationTask);
  }, [measurementId]);

  useEffect(() => {
    if (choice !== "accepted") return;
    trackPageView(pathname, measurementId);
  }, [choice, measurementId, pathname]);

  function saveChoice(nextChoice: AnalyticsConsentChoice) {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, nextChoice);
    setChoice(nextChoice);
    setIsChoosing(false);

    if (nextChoice === "accepted") {
      loadAnalytics(measurementId);
      return;
    }

    initializeConsentMode();
    window.gtag?.("consent", "update", { analytics_storage: "denied" });
    clearAnalyticsCookies();
  }

  return (
    <>
      {isChoosing ? (
        <aside className="analytics-consent" aria-label="Analytics privacy choices" aria-live="polite">
          <div>
            <strong>Optional Google Analytics</strong>
            <p>
              ElevareFit uses anonymous, cookie-free traffic measurement. With your permission, Google Analytics provides additional usage insights. Read our{" "}
              <Link href="/privacy-policy/">Privacy Policy</Link>.
            </p>
          </div>
          <div className="analytics-consent-actions">
            <button type="button" className="button button-primary" onClick={() => saveChoice("accepted")}>Accept Google Analytics</button>
            <button type="button" className="button button-secondary" onClick={() => saveChoice("declined")}>Decline Google Analytics</button>
          </div>
        </aside>
      ) : (
        <button type="button" className="analytics-consent-manage" onClick={() => setIsChoosing(true)}>
          Privacy choices
        </button>
      )}
    </>
  );
}
