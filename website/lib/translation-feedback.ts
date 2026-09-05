import { isLocale, localizePathname, type Locale } from "./i18n/config.ts";

export const TRANSLATION_FEEDBACK_CATEGORIES = [
  "incorrect",
  "unnatural",
  "untranslated",
  "display_issue",
  "other",
] as const;

export type TranslationFeedbackCategory = (typeof TRANSLATION_FEEDBACK_CATEGORIES)[number];

export const TRANSLATION_FEEDBACK_LIMITS = {
  path: 256,
  description: 1_200,
  suggestedCorrection: 1_200,
  contactEmail: 254,
  honeypot: 200,
} as const;

const FEEDBACK_PUBLIC_PATHS = [
  "/",
  "/logbook/",
  "/stagelab/",
  "/stagelab/quick-analysis/",
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TranslationFeedbackSubmission = {
  locale: Locale;
  sanitizedPublicPath: string;
  category: TranslationFeedbackCategory;
  description: string | null;
  suggestedCorrection: string | null;
  optionalContactEmail: string | null;
  clientSubmissionId: string;
  website: string;
};

export type TranslationFeedbackValidationResult =
  | { ok: true; data: TranslationFeedbackSubmission }
  | { ok: false; field: string };

function valueAsTrimmedText(value: unknown, maximumLength: number) {
  if (value === undefined || value === null || value === "") return { ok: true as const, value: null };
  if (typeof value !== "string") return { ok: false as const };

  const normalized = value.replace(/\u0000/g, "").trim();
  if (normalized.length > maximumLength) return { ok: false as const };
  return { ok: true as const, value: normalized || null };
}

function extractPathname(value: string) {
  try {
    return new URL(value, "https://www.elevarefit.com").pathname;
  } catch {
    return "";
  }
}

export function sanitizeTranslationFeedbackPath(value: string, locale: Locale) {
  if (typeof value !== "string" || value.length > 2_048) return null;

  const rawPathname = extractPathname(value).replace(/\/{2,}/g, "/");
  const pathname = rawPathname === "/" || rawPathname.endsWith("/") ? rawPathname : `${rawPathname}/`;
  const safePath = FEEDBACK_PUBLIC_PATHS
    .map((publicPath) => {
      const candidate = localizePathname(publicPath, locale);
      return candidate === "/" || candidate.endsWith("/") ? candidate : `${candidate}/`;
    })
    .find((candidate) => candidate === pathname);

  return safePath && safePath.length <= TRANSLATION_FEEDBACK_LIMITS.path ? safePath : null;
}

export function isTranslationFeedbackAvailable({
  locale,
  pathname,
  localizedRoutesEnabled,
}: {
  locale: Locale;
  pathname: string;
  localizedRoutesEnabled: boolean;
}) {
  return localizedRoutesEnabled && locale !== "en" && sanitizeTranslationFeedbackPath(pathname, locale) !== null;
}

export function validateTranslationFeedbackSubmission(input: unknown): TranslationFeedbackValidationResult {
  if (!input || typeof input !== "object") return { ok: false, field: "body" };
  const record = input as Record<string, unknown>;
  if (!isLocale(record.locale)) return { ok: false, field: "locale" };

  const sanitizedPublicPath = sanitizeTranslationFeedbackPath(
    typeof record.sanitizedPublicPath === "string" ? record.sanitizedPublicPath : "",
    record.locale,
  );
  if (!sanitizedPublicPath) return { ok: false, field: "sanitizedPublicPath" };

  if (
    typeof record.category !== "string"
    || !TRANSLATION_FEEDBACK_CATEGORIES.includes(record.category as TranslationFeedbackCategory)
  ) {
    return { ok: false, field: "category" };
  }

  const description = valueAsTrimmedText(record.description, TRANSLATION_FEEDBACK_LIMITS.description);
  if (!description.ok) return { ok: false, field: "description" };

  const suggestedCorrection = valueAsTrimmedText(
    record.suggestedCorrection,
    TRANSLATION_FEEDBACK_LIMITS.suggestedCorrection,
  );
  if (!suggestedCorrection.ok) return { ok: false, field: "suggestedCorrection" };

  const optionalContactEmail = valueAsTrimmedText(
    record.optionalContactEmail,
    TRANSLATION_FEEDBACK_LIMITS.contactEmail,
  );
  if (!optionalContactEmail.ok) return { ok: false, field: "optionalContactEmail" };
  const normalizedEmail = optionalContactEmail.value?.toLowerCase() ?? null;
  if (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
    return { ok: false, field: "optionalContactEmail" };
  }

  if (typeof record.clientSubmissionId !== "string" || !UUID_PATTERN.test(record.clientSubmissionId)) {
    return { ok: false, field: "clientSubmissionId" };
  }

  const website = valueAsTrimmedText(record.website, TRANSLATION_FEEDBACK_LIMITS.honeypot);
  if (!website.ok) return { ok: false, field: "website" };

  return {
    ok: true,
    data: {
      locale: record.locale,
      sanitizedPublicPath,
      category: record.category as TranslationFeedbackCategory,
      description: description.value,
      suggestedCorrection: suggestedCorrection.value,
      optionalContactEmail: normalizedEmail,
      clientSubmissionId: record.clientSubmissionId.toLowerCase(),
      website: website.value ?? "",
    },
  };
}
