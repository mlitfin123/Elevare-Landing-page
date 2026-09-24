import { ContextualLogbookCta } from "@/components/logbook/ContextualLogbookCta";
import type { Locale } from "@/lib/i18n/config";

type TrainingLogbookCtaProps = {
  title: string;
  description: string;
  ctaContext: string;
  locale?: Locale;
};

export function TrainingLogbookCta({ title, description, ctaContext, locale = "en" }: TrainingLogbookCtaProps) {
  // Existing callers retain their page-specific copy props while the CTA itself
  // is centralized by the content type. This lets copy variants change without
  // changing the training templates.
  void title;
  void description;

  const sourceType = ctaContext.includes("exercise") ? "exercise" : "workout";
  const ctaPosition = sourceType === "exercise" ? "post_exercise_content" : "post_workout_prescription";

  return <ContextualLogbookCta sourceType={sourceType} ctaPosition={ctaPosition} locale={locale} />;
}
