"use client";

import { ContextualLogbookCta } from "@/components/logbook/ContextualLogbookCta";
import { useCalculatorLocale, useCalculatorToolSlug } from "@/components/tools/CalculatorLocalization";

export function CalculatorLogbookCta() {
  const locale = useCalculatorLocale();
  const toolSlug = useCalculatorToolSlug();

  if (!toolSlug) return null;

  return (
    <ContextualLogbookCta
      sourceType="calculator"
      ctaPosition="calculator_result"
      locale={locale}
      toolSlug={toolSlug}
    />
  );
}
