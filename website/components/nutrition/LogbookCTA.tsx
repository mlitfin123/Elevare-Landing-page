import { ContextualLogbookCta } from "@/components/logbook/ContextualLogbookCta";
import type { Locale } from "@/lib/i18n/config";

type LogbookCTAProps = {
  context: string;
  locale?: Locale;
};

export function LogbookCTA({ context, locale = "en" }: LogbookCTAProps) {
  void context;
  return <ContextualLogbookCta sourceType="restaurant" ctaPosition="nutrition_results" locale={locale} />;
}
