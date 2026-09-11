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
import { clearLegacyProfileViewStorage, hasBrowserPrivacySignal, readProfileViewChoice, storeProfileViewChoice, type ProfileViewChoice } from "@/lib/profile-view-privacy";

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
  const [profileStatisticsChoice, setProfileStatisticsChoice] = useState<ProfileViewChoice>(null);
  const [browserPrivacySignal, setBrowserPrivacySignal] = useState(false);

  useEffect(() => {
    clearLegacyProfileViewStorage();
    const nextChoice = readAnalyticsConsentChoice();
    const hydrationTask = window.setTimeout(() => {
      setIsChoosing(nextChoice === null);
      setProfileStatisticsChoice(readProfileViewChoice());
      setBrowserPrivacySignal(hasBrowserPrivacySignal());
    }, 0);
    return () => window.clearTimeout(hydrationTask);
  }, []);

  function saveChoice(nextChoice: AnalyticsConsentChoice) {
    storeAnalyticsConsentChoice(nextChoice);
    setProfileStatisticsChoice(readProfileViewChoice());
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
            <p>{browserPrivacySignal ? consentMessages.profileStatisticsSignal : consentMessages.profileStatisticsNotice}</p>
            <details className="profile-statistics-choice">
              <summary>{consentMessages.profileStatisticsLabel}</summary>
              <p>{browserPrivacySignal ? consentMessages.profileStatisticsSignal : consentMessages.profileStatisticsBody}</p>
              <div className="button-row">
                <button type="button" className="button button-secondary" disabled={browserPrivacySignal} aria-pressed={profileStatisticsChoice === "accepted"}
                  onClick={() => { storeProfileViewChoice("accepted"); setProfileStatisticsChoice(readProfileViewChoice()); }}>{consentMessages.profileStatisticsAllow}</button>
                <button type="button" className="button button-secondary" aria-pressed={profileStatisticsChoice === "declined"}
                  onClick={() => { storeProfileViewChoice("declined"); setProfileStatisticsChoice("declined"); }}>{consentMessages.profileStatisticsDecline}</button>
              </div>
            </details>
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
