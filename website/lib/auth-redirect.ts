import { areLocalizedRoutesEnabled, localizePathname, type Locale } from "./i18n/config.ts";

export function getSafeAuthRedirect(value: string | null | undefined, fallback = "/account/") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;

  try {
    const parsed = new URL(value, "https://www.elevarefit.com");
    if (parsed.origin !== "https://www.elevarefit.com") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function getAuthIntent(value: string | null | undefined) {
  return value === "professional" ? "professional" : null;
}

export function getSignupIntro(intent: string | null | undefined) {
  return getAuthIntent(intent) === "professional"
    ? {
        headline: "Create your professional profile",
        description: "Start by creating an account. Next, add your services, specialties, and professional details to build your listing.",
      }
    : {
        headline: "Join Elevare Fit",
        description: "Find a professional or create your own professional listing.",
      };
}

function accountPath(locale: Locale) {
  return areLocalizedRoutesEnabled() ? localizePathname("/account/", locale) : "/account/";
}

export function getProfessionalProfilePath(locale: Locale) {
  const path = areLocalizedRoutesEnabled()
    ? localizePathname("/account/professional-profile/", locale)
    : "/account/professional-profile/";
  return `${path}?intent=professional`;
}

export function getAuthReturnPath(redirect: string | null, intent: string | null, locale: Locale) {
  const explicitRedirect = getSafeAuthRedirect(redirect, "");
  if (explicitRedirect) return explicitRedirect;

  return getAuthIntent(intent) === "professional" ? getProfessionalProfilePath(locale) : accountPath(locale);
}

export function getAuthConfirmationPath(redirect: string | null, intent: string | null, locale: Locale) {
  const explicitRedirect = getSafeAuthRedirect(redirect, "");
  const professionalIntent = getAuthIntent(intent) === "professional";

  if (!explicitRedirect) {
    return professionalIntent ? getProfessionalProfilePath(locale) : accountPath(locale);
  }

  const params = new URLSearchParams({ redirect: explicitRedirect });
  if (professionalIntent) params.set("intent", "professional");
  return `${accountPath(locale)}?${params}`;
}

export function getPostAuthDestination({
  redirect,
  intent,
  locale,
  professionalStateLoaded,
}: {
  redirect: string | null;
  intent: string | null;
  locale: Locale;
  professionalStatus: string | null;
  professionalStateLoaded: boolean;
}) {
  const explicitRedirect = getSafeAuthRedirect(redirect, "");
  if (explicitRedirect) return explicitRedirect;

  if (getAuthIntent(intent) === "professional" && professionalStateLoaded) {
    // The editor is also the status and management screen for submitted and
    // approved profiles, so this resumes the existing profile instead of
    // dropping professional-acquisition traffic into the client dashboard.
    return getProfessionalProfilePath(locale);
  }

  return accountPath(locale);
}
