import type { Locale } from "@/lib/i18n/config";
import english from "@/locales/en/quick-analysis";
import spanish from "@/locales/es-419/quick-analysis";
import portuguese from "@/locales/pt-BR/quick-analysis";

const messages = {
  en: english,
  "es-419": spanish,
  "pt-BR": portuguese,
} as const;

export function getQuickAnalysisMessages(locale: Locale) {
  return messages[locale] ?? messages.en;
}
