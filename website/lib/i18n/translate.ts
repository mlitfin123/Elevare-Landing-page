import type { Locale } from "@/lib/i18n/config";

type TranslationTree = { [key: string]: string | TranslationTree };

function readPath(dictionary: TranslationTree, key: string) {
  return key.split(".").reduce<string | TranslationTree | undefined>((value, segment) => {
    if (!value || typeof value === "string") return undefined;
    return value[segment];
  }, dictionary);
}

export function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}

export function getTranslation(
  dictionary: TranslationTree,
  englishFallback: TranslationTree,
  key: string,
  values: Record<string, string | number> = {},
) {
  const localized = readPath(dictionary, key);
  const fallback = readPath(englishFallback, key);
  const resolved = typeof localized === "string" ? localized : typeof fallback === "string" ? fallback : "";

  if (!resolved && process.env.NODE_ENV !== "production") {
    console.warn(`[i18n] Missing translation: ${key}`);
  }

  return interpolate(resolved, values);
}

export function pluralize(
  locale: Locale,
  count: number,
  forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
) {
  const category = new Intl.PluralRules(locale).select(count);
  return interpolate(forms[category] ?? forms.other, { count });
}
