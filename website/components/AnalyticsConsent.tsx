"use client";

import { useEffect, useState } from "react";
import {
  readAnalyticsConsentChoice,
  storeAnalyticsConsentChoice,
  type AnalyticsConsentChoice,
} from "@/lib/analytics-consent";

function clearAnalyticsCookies() {
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (!name || !(name === "_ga" || name === "_gid" || name.startsWith("_ga_"))) return;
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.elevarefit.com; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.elevarefit.org; SameSite=Lax`;
  });
}

function updateGoogleConsent(choice: AnalyticsConsentChoice) {
  window.gtag?.("consent", "update", {
    analytics_storage: choice === "accepted" ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export function AnalyticsConsent() {
  const [isChoosing, setIsChoosing] = useState(false);

  useEffect(() => {
    const nextChoice = readAnalyticsConsentChoice();
    const hydrationTask = window.setTimeout(() => {
      setIsChoosing(nextChoice === null);
    }, 0);
    return () => window.clearTimeout(hydrationTask);
  }, []);

  function saveChoice(nextChoice: AnalyticsConsentChoice) {
    storeAnalyticsConsentChoice(nextChoice);
    setIsChoosing(false);
    updateGoogleConsent(nextChoice);

    if (nextChoice === "declined") clearAnalyticsCookies();
  }

  return (
    <>
      {isChoosing ? (
        <aside className="analytics-consent" aria-label="Analytics privacy choices" aria-live="polite">
          <div>
            <strong>Optional Google Analytics</strong>
            <p>
              ElevareFit uses anonymous, cookie-free traffic measurement. With your permission, Google Analytics may use analytics cookies to provide additional usage insights. Read our{" "}
              <a href="/privacy-policy/">Privacy Policy</a>.
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
