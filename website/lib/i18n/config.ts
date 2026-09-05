export const SUPPORTED_LOCALES = ["en", "es-419", "pt-BR"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE_NAME = "elevare_locale";
export const LOCALE_STORAGE_KEY = "elevare.locale";
export const LOCALE_DETECTION_KEY = "elevare.locale.detected";

export const LOCALIZED_MARKETING_PATHS = [
  "/",
  "/logbook/",
  "/stagelab/",
  "/stagelab/quick-analysis/",
  "/stagelab/quick-analysis/result/",
] as const;

export const LOCALIZED_CATALOG_PATH_PREFIXES = ["/exercises/", "/nutrition/"] as const;

const LATIN_AMERICAN_SPANISH_REGIONS = new Set([
  "419",
  "AR",
  "BO",
  "BR",
  "BZ",
  "CL",
  "CO",
  "CR",
  "CU",
  "DO",
  "EC",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PE",
  "PR",
  "PY",
  "SV",
  "US",
  "UY",
  "VE",
]);

const LOCALE_SEGMENTS: Record<Locale, string> = {
  en: "",
  "es-419": "es",
  "pt-BR": "pt-br",
};

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function areLocalizedRoutesEnabled(
  env: { NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES?: string } = process.env as {
    NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES?: string;
  },
) {
  return enabled(env.NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES);
}

export function isLocalizedIndexingEnabled(
  env: { ENABLE_LOCALIZED_INDEXING?: string; NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES?: string } = process.env as {
    ENABLE_LOCALIZED_INDEXING?: string;
    NEXT_PUBLIC_ENABLE_LOCALIZED_ROUTES?: string;
  },
) {
  return areLocalizedRoutesEnabled(env) && enabled(env.ENABLE_LOCALIZED_INDEXING);
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value?.trim()) return DEFAULT_LOCALE;

  try {
    const parsed = new Intl.Locale(value.replaceAll("_", "-"));
    const language = parsed.language.toLowerCase();
    const region = parsed.region?.toUpperCase();

    if (language === "en") return "en";
    if (language === "es" && (!region || LATIN_AMERICAN_SPANISH_REGIONS.has(region))) return "es-419";
    if (language === "pt" && region === "BR") return "pt-BR";
  } catch {
    return DEFAULT_LOCALE;
  }

  return DEFAULT_LOCALE;
}

export function resolvePreferredLocale({
  explicitLocale,
  authenticatedLocale,
  savedLocale,
  browserLocales = [],
}: {
  explicitLocale?: string | null;
  authenticatedLocale?: string | null;
  savedLocale?: string | null;
  browserLocales?: readonly string[];
}): Locale {
  if (explicitLocale) return normalizeLocale(explicitLocale);
  if (authenticatedLocale) return normalizeLocale(authenticatedLocale);
  if (savedLocale) return normalizeLocale(savedLocale);

  for (const browserLocale of browserLocales) {
    const normalized = normalizeLocale(browserLocale);
    if (normalized !== DEFAULT_LOCALE || browserLocale.toLowerCase().startsWith("en")) return normalized;
  }

  return DEFAULT_LOCALE;
}

export function localeToSegment(locale: Locale) {
  return LOCALE_SEGMENTS[locale];
}

export function localeFromPathname(pathname: string): Locale {
  const firstSegment = pathname.split(/[?#]/, 1)[0]?.split("/").filter(Boolean)[0]?.toLowerCase();
  if (firstSegment === "es") return "es-419";
  if (firstSegment === "pt-br") return "pt-BR";
  return DEFAULT_LOCALE;
}

function splitPath(pathname: string) {
  const hashIndex = pathname.indexOf("#");
  const hash = hashIndex >= 0 ? pathname.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? pathname.slice(0, hashIndex) : pathname;
  const queryIndex = withoutHash.indexOf("?");
  const search = queryIndex >= 0 ? withoutHash.slice(queryIndex) : "";
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  return { path: path || "/", search, hash };
}

function normalizePathOnly(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export function stripLocalePrefix(pathname: string) {
  const { path, search, hash } = splitPath(pathname);
  const stripped = path.replace(/^\/(?:es|pt-br)(?=\/|$)/i, "") || "/";
  return `${normalizePathOnly(stripped)}${search}${hash}`;
}

export function isLocalizedMarketingPath(pathname: string) {
  const { path } = splitPath(stripLocalePrefix(pathname));
  const normalizedPath = normalizePathOnly(path);
  return LOCALIZED_MARKETING_PATHS.includes(normalizedPath as (typeof LOCALIZED_MARKETING_PATHS)[number])
    || LOCALIZED_CATALOG_PATH_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

export function localizePathname(pathname: string, locale: Locale) {
  const stripped = stripLocalePrefix(pathname);
  const { path, search, hash } = splitPath(stripped);
  const normalizedPath = normalizePathOnly(path);

  if (!isLocalizedMarketingPath(normalizedPath)) {
    return locale === DEFAULT_LOCALE ? normalizedPath : `/${localeToSegment(locale)}/`;
  }

  if (locale === DEFAULT_LOCALE) return `${normalizedPath}${search}${hash}`;

  const suffix = normalizedPath === "/" ? "" : normalizedPath;
  return `/${localeToSegment(locale)}${suffix}${search}${hash}`;
}

export function getLocaleSwitchHref(pathname: string, targetLocale: Locale) {
  const currentLocale = localeFromPathname(pathname);
  if (currentLocale === targetLocale) return pathname;
  return localizePathname(pathname, targetLocale);
}

export function getLocalizedRouteParams() {
  if (!areLocalizedRoutesEnabled()) return [];

  return (["es-419", "pt-BR"] as const).flatMap((locale) => {
    const localeSegment = localeToSegment(locale);
    return [
      { locale: localeSegment, slug: [] },
      { locale: localeSegment, slug: ["logbook"] },
      { locale: localeSegment, slug: ["stagelab"] },
      { locale: localeSegment, slug: ["stagelab", "quick-analysis"] },
      { locale: localeSegment, slug: ["stagelab", "quick-analysis", "result"] },
    ];
  });
}

export function localeFromSegment(segment: string): Locale | null {
  const normalized = segment.toLowerCase();
  if (normalized === "es") return "es-419";
  if (normalized === "pt-br") return "pt-BR";
  return null;
}

export function toOpenGraphLocale(locale: Locale) {
  if (locale === "es-419") return "es_419";
  if (locale === "pt-BR") return "pt_BR";
  return "en_US";
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDate(value: Date | string | number, locale: Locale, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}
