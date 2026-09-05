"use client";

import type { ChangeEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getLocaleSwitchHref,
  type Locale,
  LOCALE_COOKIE_NAME,
  LOCALE_DETECTION_KEY,
  LOCALE_STORAGE_KEY,
  localeFromPathname,
  SUPPORTED_LOCALES,
} from "@/lib/i18n/config";
import { getShellMessages } from "@/lib/i18n/shell-messages";

function saveLocalePreference(locale: Locale) {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  window.sessionStorage.setItem(LOCALE_DETECTION_KEY, "1");
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function LanguageSelector() {
  const pathname = usePathname();
  const router = useRouter();
  const activeLocale = localeFromPathname(pathname);
  const messages = getShellMessages(activeLocale);
  const localizedRoutesEnabled = process.env.NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES === "true";

  if (!localizedRoutesEnabled) return null;

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const locale = event.target.value as Locale;
    saveLocalePreference(locale);
    router.push(getLocaleSwitchHref(pathname, locale));
  }

  const labels: Record<Locale, string> = {
    en: messages.language.english,
    "es-419": messages.language.spanish,
    "pt-BR": messages.language.portugueseBrazil,
  };

  return (
    <label className="language-selector">
      <span className="sr-only">{messages.language.label}</span>
      <select aria-label={messages.language.label} value={activeLocale} onChange={handleChange}>
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>{labels[locale]}</option>
        ))}
      </select>
    </label>
  );
}
