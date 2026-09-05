"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  readAnalyticsConsentChoice,
  storeAnalyticsConsentChoice,
  type AnalyticsConsentChoice,
} from "@/lib/analytics-consent";
import { localeFromPathname } from "@/lib/i18n/config";
import { getShellMessages } from "@/lib/i18n/shell-messages";

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
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const messages = getShellMessages(locale);
  const consentMessages = messages.analyticsConsent;
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
        <aside className="analytics-consent" aria-label={consentMessages.ariaLabel} aria-live="polite">
          <div>
            <strong>{consentMessages.title}</strong>
            <p>
              {consentMessages.body}{" "}
              <a href="/privacy-policy/" hrefLang="en">{messages.footer.privacyPolicyEnglish}</a>.
            </p>
          </div>
          <div className="analytics-consent-actions">
            <button type="button" className="button button-primary" onClick={() => saveChoice("accepted")}>{consentMessages.accept}</button>
            <button type="button" className="button button-secondary" onClick={() => saveChoice("declined")}>{consentMessages.decline}</button>
          </div>
        </aside>
      ) : (
        <button type="button" className="analytics-consent-manage" onClick={() => setIsChoosing(true)}>
          {consentMessages.manage}
        </button>
      )}
    </>
  );
}
