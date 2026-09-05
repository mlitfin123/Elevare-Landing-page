import { DEFAULT_LOCALE, isLocale, type Locale } from "./i18n/config.ts";

export const QUICK_ANALYSIS_LANGUAGE_INSTRUCTIONS: Record<Locale, string> = {
  en: "Write all user-facing narrative in clear English. Do not modify JSON keys, enum values, pose identifiers, numerical values, ranges, confidence values, classifications, or decision logic.",
  "es-419": "Write all user-facing narrative in natural Latin American Spanish. Use terminology appropriate for physique competition and contest preparation. Do not translate or modify JSON keys, enum values, pose identifiers, numerical values, ranges, confidence values, classifications, or decision logic.",
  "pt-BR": "Write all user-facing narrative in natural Brazilian Portuguese. Use terminology appropriate for physique competition and contest preparation. Do not translate or modify JSON keys, enum values, pose identifiers, numerical values, ranges, confidence values, classifications, or decision logic.",
};

type QuickAnalysisGenerationEnv = {
  ENABLE_QUICK_ANALYSIS_ES_419_GENERATION?: string;
  ENABLE_QUICK_ANALYSIS_PT_BR_GENERATION?: string;
};

export function parseQuickAnalysisLocale(value: unknown): Locale | null {
  if (value == null || value === "") return DEFAULT_LOCALE;
  return isLocale(value) ? value : null;
}

export function normalizeStoredQuickAnalysisLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function isQuickAnalysisNarrativeGenerationEnabled(
  locale: Locale,
  env: QuickAnalysisGenerationEnv = process.env as QuickAnalysisGenerationEnv,
) {
  if (locale === "en") return true;
  const value = locale === "es-419"
    ? env.ENABLE_QUICK_ANALYSIS_ES_419_GENERATION
    : env.ENABLE_QUICK_ANALYSIS_PT_BR_GENERATION;
  return value?.trim().toLowerCase() === "true";
}

export function resolveQuickAnalysisGenerationLocale(locale: Locale, env?: Parameters<typeof isQuickAnalysisNarrativeGenerationEnabled>[1]) {
  return isQuickAnalysisNarrativeGenerationEnabled(locale, env) ? locale : DEFAULT_LOCALE;
}

export function getQuickAnalysisLanguageInstruction(locale: unknown) {
  const normalized = normalizeStoredQuickAnalysisLocale(locale);
  return QUICK_ANALYSIS_LANGUAGE_INSTRUCTIONS[normalized];
}

export function getStripeCheckoutLocale(locale: Locale): "en" | "es" | "pt-BR" {
  if (locale === "es-419") return "es";
  return locale;
}
