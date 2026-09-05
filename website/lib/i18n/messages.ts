import type { Locale } from "@/lib/i18n/config";
import type { MarketingMessages } from "@/lib/i18n/marketing-types";

const loaders: Record<Locale, () => Promise<{ default: MarketingMessages }>> = {
  en: () => import("@/locales/en/marketing"),
  "es-419": () => import("@/locales/es-419/marketing"),
  "pt-BR": () => import("@/locales/pt-BR/marketing"),
};

export async function getMarketingMessages(locale: Locale) {
  const dictionaryModule = await loaders[locale]();
  return dictionaryModule.default;
}
