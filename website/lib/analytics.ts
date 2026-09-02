"use client";

export type AnalyticsEventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const blockedAnalyticsParameterNames = new Set([
  "access_token",
  "address",
  "auth_id",
  "checkout_session_id",
  "email",
  "email_address",
  "full_name",
  "phone",
  "phone_number",
  "profile_id",
  "profile_slug",
  "professional_id",
  "professional_name",
  "professional_slug",
  "refresh_token",
  "session_id",
  "street_address",
  "supabase_id",
  "token",
  "user_id",
]);

function sanitizeAnalyticsPath(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  return /^\/professionals\/[^/]+\/?$/i.test(path) ? "/professionals/profile/" : path;
}

function sanitizeAnalyticsUrl(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    return `${url.origin}${sanitizeAnalyticsPath(url.pathname)}`;
  } catch {
    return sanitizeAnalyticsPath(value);
  }
}

export function sanitizeAnalyticsParams(params: AnalyticsEventParams) {
  return Object.entries(params).reduce<AnalyticsEventParams>((sanitized, [key, value]) => {
    if (value === undefined || blockedAnalyticsParameterNames.has(key.toLowerCase())) return sanitized;
    if (typeof value !== "string") {
      sanitized[key] = value;
      return sanitized;
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return sanitized;

    sanitized[key] = key.toLowerCase().endsWith("_url")
      ? sanitizeAnalyticsUrl(value)
      : value.slice(0, 100);
    return sanitized;
  }, {});
}

export function trackEvent(eventName: string, params: AnalyticsEventParams = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, sanitizeAnalyticsParams(params));
}

export function trackPageView(pagePath: string, measurementId: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  const sanitizedPath = sanitizeAnalyticsPath(pagePath);
  const isProfessionalProfile = sanitizedPath === "/professionals/profile/";

  window.gtag("event", "page_view", {
    page_path: sanitizedPath,
    page_location: `${window.location.origin}${sanitizedPath}`,
    page_title: isProfessionalProfile ? "Professional profile | ElevareFit" : document.title,
    send_to: measurementId,
  });
}
