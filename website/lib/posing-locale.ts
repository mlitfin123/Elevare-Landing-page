import type { Locale } from "./i18n/config.ts";
/** Posing uses all supported locales by default. Quick Analysis flags are unrelated.
 * An explicit posing kill switch rejects checkout rather than silently using English. */
export function resolvePosingGenerationLocale(value: unknown, env: Record<string, string | undefined> = process.env): Locale {
  const locale = value === "es-419" || value === "pt-BR" ? value : "en";
  const flag = locale === "es-419" ? env.ENABLE_POSING_ANALYSIS_ES_419_GENERATION : locale === "pt-BR" ? env.ENABLE_POSING_ANALYSIS_PT_BR_GENERATION : undefined;
  if (flag?.trim().toLowerCase() === "false") throw new Error("POSING_LOCALE_UNAVAILABLE");
  return locale;
}
