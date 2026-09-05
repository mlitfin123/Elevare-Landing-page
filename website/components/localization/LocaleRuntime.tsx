"use client";

import { useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  getLocaleSwitchHref,
  isLocalizedMarketingPath,
  isLocale,
  LOCALE_COOKIE_NAME,
  LOCALE_DETECTION_KEY,
  LOCALE_STORAGE_KEY,
  localeFromPathname,
  resolvePreferredLocale,
} from "@/lib/i18n/config";

function readCookiePreference() {
  const prefix = `${LOCALE_COOKIE_NAME}=`;
  const cookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export function LocaleRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const localizedRoutesEnabled = process.env.NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES === "true";

  useLayoutEffect(() => {
    const activeLocale = localeFromPathname(pathname);
    document.documentElement.lang = activeLocale;

    if (!localizedRoutesEnabled || activeLocale !== DEFAULT_LOCALE || !isLocalizedMarketingPath(pathname)) return;

    const localPreference = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const cookiePreference = readCookiePreference();
    const savedPreference = localPreference ?? cookiePreference;

    if (savedPreference && isLocale(savedPreference) && savedPreference !== DEFAULT_LOCALE) {
      router.replace(getLocaleSwitchHref(pathname, savedPreference));
      return;
    }

    if (window.sessionStorage.getItem(LOCALE_DETECTION_KEY)) return;
    window.sessionStorage.setItem(LOCALE_DETECTION_KEY, "1");

    if (savedPreference) return;

    const browserLocale = resolvePreferredLocale({
      browserLocales: navigator.languages?.length ? [...navigator.languages] : [navigator.language],
    });
    if (browserLocale !== DEFAULT_LOCALE) {
      router.replace(getLocaleSwitchHref(pathname, browserLocale));
    }
  }, [localizedRoutesEnabled, pathname, router]);

  return null;
}
