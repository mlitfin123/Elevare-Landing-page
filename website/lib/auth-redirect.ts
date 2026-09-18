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

export function getAuthReturnPath(redirect: string | null, intent: string | null, locale: Locale) {
  const explicitRedirect = getSafeAuthRedirect(redirect, "");
  if (explicitRedirect) return explicitRedirect;

  const path = accountPath(locale);
  return getAuthIntent(intent) === "professional" ? `${path}?intent=professional` : path;
}

export function getAuthConfirmationPath(redirect: string | null, intent: string | null, locale: Locale) {
  const path = accountPath(locale);
  const params = new URLSearchParams();
  const explicitRedirect = getSafeAuthRedirect(redirect, "");
  if (explicitRedirect) params.set("redirect", explicitRedirect);
  if (getAuthIntent(intent) === "professional") params.set("intent", "professional");
  return params.size ? `${path}?${params}` : path;
}

export function getPostAuthDestination({
  redirect,
  intent,
  locale,
  professionalStatus,
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

  if (getAuthIntent(intent) === "professional" && professionalStateLoaded
    && (professionalStatus === null || professionalStatus === "draft")) {
    return areLocalizedRoutesEnabled()
      ? localizePathname("/account/professional-profile/", locale)
      : "/account/professional-profile/";
  }

  return accountPath(locale);
}
