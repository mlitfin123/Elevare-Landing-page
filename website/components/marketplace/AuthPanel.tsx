"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AGE_ATTESTATION_VERSION, PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import { getAuthConfirmationPath, getAuthIntent, getAuthReturnPath, getSafeAuthRedirect, getSignupIntro } from "@/lib/auth-redirect";
import {
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  areLocalizedRoutesEnabled,
  isLocale,
  localeFromPathname,
  localizePathname,
  resolvePreferredLocale,
  type Locale,
} from "@/lib/i18n/config";
import { marketplaceText } from "@/lib/i18n/marketplace-content";
import { absoluteUrl } from "@/lib/site";
import { getSupabaseBrowserClient, isMarketplaceAuthConfigured } from "@/lib/supabase-browser";
import { trackEvent } from "@/lib/analytics";
import {
  appendProfessionalAcquisitionParams,
  getProfessionalAcquisitionCopy,
  professionalAcquisitionAnalytics,
  readProfessionalAcquisitionAttribution,
} from "@/lib/professional-acquisition";

export function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const intent = getAuthIntent(searchParams.get("intent"));
  const redirectPath = useMemo(() => getSafeAuthRedirect(redirect), [redirect]);
  const requestedLocale = searchParams.get("locale");
  const redirectLocale = localeFromPathname(redirectPath);
  const urlLocale = isLocale(requestedLocale) ? requestedLocale : redirectLocale !== "en" ? redirectLocale : null;
  const locale: Locale = urlLocale ?? "en";
  const professionalCopy = getProfessionalAcquisitionCopy(locale);
  const signupIntro = intent === "professional" ? professionalCopy.signup : getSignupIntro(intent);
  const acquisitionAttribution = readProfessionalAcquisitionAttribution(searchParams);
  const professionalAnalytics = professionalAcquisitionAnalytics(acquisitionAttribution);
  const isProfessionalSignup = intent === "professional";
  const legalLocale = areLocalizedRoutesEnabled() ? locale : "en";
  const t = (value: string) => marketplaceText(locale, value);
  const [mode, setMode] = useState<"sign-in" | "sign-up">(intent === "professional" ? "sign-up" : "sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasAcceptedLegalTerms, setHasAcceptedLegalTerms] = useState(false);
  const [hasConfirmedAge, setHasConfirmedAge] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signupViewTracked = useRef(false);
  const signupStartedTracked = useRef(false);
  const signupCompletedTracked = useRef(false);

  const isConfigured = isMarketplaceAuthConfigured();

  useEffect(() => {
    if (!isProfessionalSignup || mode !== "sign-up" || signupViewTracked.current) return;
    signupViewTracked.current = true;
    trackEvent("professional_signup_view", professionalAnalytics);
  }, [isProfessionalSignup, mode, professionalAnalytics]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      setFeedback(t("Marketplace authentication is not configured yet."));
      setFeedbackType("error");
      return;
    }

    if (mode === "sign-up" && password !== confirmPassword) {
      setFeedback(t("Passwords do not match."));
      setFeedbackType("error");
      return;
    }

    if (mode === "sign-up" && !hasAcceptedLegalTerms) {
      setFeedback(t("Please agree to the Terms of Service and Privacy Policy to create an account."));
      setFeedbackType("error");
      return;
    }

    if (mode === "sign-up" && !hasConfirmedAge) {
      setFeedback(t("Please confirm that you are at least 18 years old to create an account."));
      setFeedbackType("error");
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setFeedback(t("Marketplace authentication is not configured yet."));
      setFeedbackType("error");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const browserLocales = navigator.languages?.length ? navigator.languages : [navigator.language];
      const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY) ?? readCookie(LOCALE_COOKIE_NAME);
      const flowLocale = resolvePreferredLocale({
        explicitLocale: urlLocale,
        savedLocale,
        browserLocales,
      });

      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        router.push(getAuthReturnPath(redirect, intent, flowLocale));
        router.refresh();
        return;
      }

      if (isProfessionalSignup && !signupStartedTracked.current) {
        signupStartedTracked.current = true;
        trackEvent("professional_signup_started", professionalAnalytics);
      }

      const signupLocale = flowLocale;
      const signupBrowserLocale = resolvePreferredLocale({ browserLocales });
      const confirmationPath = getAuthConfirmationPath(redirect, intent, signupLocale);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: absoluteUrl(isProfessionalSignup
            ? appendProfessionalAcquisitionParams(confirmationPath, acquisitionAttribution)
            : confirmationPath),
          data: {
            legal_acceptance: true,
            legal_acceptance_source: "website_signup",
            terms_version: TERMS_VERSION,
            privacy_version: PRIVACY_VERSION,
            age_18_plus: true,
            age_attestation_version: AGE_ATTESTATION_VERSION,
            age_attestation_source: "website_signup",
            signup_locale: signupLocale,
            browser_locale_at_signup: signupBrowserLocale,
            professional_acquisition: isProfessionalSignup ? acquisitionAttribution : undefined,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (isProfessionalSignup && !signupCompletedTracked.current) {
        signupCompletedTracked.current = true;
        const accountCreatedAnalytics = { ...professionalAnalytics, account_type: "new_account" };
        trackEvent("professional_signup_completed", accountCreatedAnalytics);
        trackEvent("professional_account_created", accountCreatedAnalytics);
      }

      if (data.session) {
        router.push(getAuthReturnPath(redirect, intent, signupLocale));
        router.refresh();
        return;
      }

      setFeedback(t("Account created. Check your email if confirmation is enabled, then sign in."));
      setFeedbackType("success");
      setMode("sign-in");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : t("We could not complete that request."));
      setFeedbackType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="waitlist-card auth-card">
      <div className="card-kicker">{t("Elevare account")}</div>
      <h2>{t(mode === "sign-in" ? "Sign in to continue." : signupIntro.headline)}</h2>
      <p>
        {t(mode === "sign-in"
          ? "Browsing profiles stays public. Sign in when you want to save profiles, send a consultation request, or build your own listing."
          : signupIntro.description)}
      </p>
      {mode === "sign-up" && isProfessionalSignup ? <p className="auth-professional-benefit">{professionalCopy.signup.benefit}</p> : null}

      <div className="audience-switcher" role="tablist" aria-label={t("Authentication mode")}>
        <button
          type="button"
          role="tab"
          className={`audience-option${mode === "sign-in" ? " is-active" : ""}`}
          aria-selected={mode === "sign-in"}
          onClick={() => setMode("sign-in")}
        >
          {t("Sign in")}
        </button>
        <button
          type="button"
          role="tab"
          className={`audience-option${mode === "sign-up" ? " is-active" : ""}`}
          aria-selected={mode === "sign-up"}
          onClick={() => setMode("sign-up")}
        >
          {t("Create account")}
        </button>
      </div>

      <form className="waitlist-form" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label className="field field-full">
            <span className="field-label">{t("Email address")}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="field field-full">
            <span className="field-label">{t("Password")}</span>
            <div className="password-input">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("Password")}
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}>
                {showPassword ? professionalCopy.signup.hidePassword : professionalCopy.signup.showPassword}
              </button>
            </div>
          </label>

          {mode === "sign-up" ? (
            <>
              <label className="field field-full">
                <span className="field-label">{t("Confirm password")}</span>
                <div className="password-input">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={t("Confirm password")}
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}>
                    {showPassword ? professionalCopy.signup.hidePassword : professionalCopy.signup.showPassword}
                  </button>
                </div>
              </label>
              <label className="checkbox-row professional-attestation field-full">
                <input
                  type="checkbox"
                  checked={hasAcceptedLegalTerms}
                  onChange={(event) => setHasAcceptedLegalTerms(event.target.checked)}
                />
                <span>
                  {t("I agree to the")}{" "}<a href={localizePathname("/terms-of-service/", legalLocale)} hrefLang={legalLocale}>{t("Terms of Service")}</a>{" "}{t("and acknowledge the")}{" "}
                  <a href={localizePathname("/privacy-policy/", legalLocale)} hrefLang={legalLocale}>{t("Privacy Policy")}</a>.
                </span>
              </label>
              <label className="checkbox-row professional-attestation field-full">
                <input
                  type="checkbox"
                  checked={hasConfirmedAge}
                  onChange={(event) => setHasConfirmedAge(event.target.checked)}
                />
                <span>{t("I confirm that I am at least 18 years old.")}</span>
              </label>
            </>
          ) : null}
        </div>

        <div className="form-note">
          {mode === "sign-up" && isProfessionalSignup
            ? professionalCopy.signup.note
            : mode === "sign-up"
              ? t("After creating your account, you can find professionals or start your own professional listing.")
              : t("After you sign in, you can save profiles, request consultations, manage your private client profile, or build your public profile.")}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="button button-primary"
            disabled={isSubmitting || (mode === "sign-up" && (!hasAcceptedLegalTerms || !hasConfirmedAge))}
          >
            {t(isSubmitting ? "Submitting..." : mode === "sign-in" ? "Sign in" : "Create account")}
          </button>
          {feedback ? <div role={feedbackType === "error" ? "alert" : "status"} className={`form-feedback ${feedbackType === "error" ? "is-error" : "is-success"}`}>{feedback}</div> : null}
        </div>
      </form>
    </article>
  );
}

function readCookie(name: string) {
  const prefix = `${encodeURIComponent(name)}=`;
  const match = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}
