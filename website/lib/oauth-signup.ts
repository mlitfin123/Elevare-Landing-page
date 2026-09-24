import {
  AGE_ATTESTATION_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "./legal.ts";
import type { Locale } from "./i18n/config.ts";

const OAUTH_SIGNUP_STORAGE_KEY = "elevare-oauth-signup-v1";

type OAuthSignupMetadata = {
  legal_acceptance: true;
  legal_acceptance_source: "website_oauth_signup";
  terms_version: string;
  privacy_version: string;
  age_18_plus: true;
  age_attestation_version: string;
  age_attestation_source: "website_oauth_signup";
  signup_locale: Locale;
  browser_locale_at_signup: Locale;
};

export function savePendingOAuthSignup({
  signupLocale,
  browserLocale,
}: {
  signupLocale: Locale;
  browserLocale: Locale;
}) {
  const metadata: OAuthSignupMetadata = {
    legal_acceptance: true,
    legal_acceptance_source: "website_oauth_signup",
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
    age_18_plus: true,
    age_attestation_version: AGE_ATTESTATION_VERSION,
    age_attestation_source: "website_oauth_signup",
    signup_locale: signupLocale,
    browser_locale_at_signup: browserLocale,
  };

  window.sessionStorage.setItem(OAUTH_SIGNUP_STORAGE_KEY, JSON.stringify(metadata));
}

export function readPendingOAuthSignup() {
  const raw = window.sessionStorage.getItem(OAUTH_SIGNUP_STORAGE_KEY);
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<OAuthSignupMetadata>;
    if (
      value.legal_acceptance !== true
      || value.age_18_plus !== true
      || value.terms_version !== TERMS_VERSION
      || value.privacy_version !== PRIVACY_VERSION
      || value.age_attestation_version !== AGE_ATTESTATION_VERSION
      || typeof value.signup_locale !== "string"
      || typeof value.browser_locale_at_signup !== "string"
    ) return null;

    return value as OAuthSignupMetadata;
  } catch {
    return null;
  }
}

export function clearPendingOAuthSignup() {
  window.sessionStorage.removeItem(OAUTH_SIGNUP_STORAGE_KEY);
}
