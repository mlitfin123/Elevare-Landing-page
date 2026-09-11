"use client";
import { useCalculatorLocale } from "@/components/tools/CalculatorLocalization";
import { StageAnalysisCard } from "./StageAnalysisCard";
import type { StageAnalysisProduct } from "@/lib/stage-analysis";
import type { QuickAnalysisSource } from "@/lib/quick-analysis-attribution";
import type { Locale } from "@/lib/i18n/config";

export function ContextualAnalysisCTA({ product, source, locale }: { product: StageAnalysisProduct; source: QuickAnalysisSource; locale?: Locale }) {
  const inheritedLocale = useCalculatorLocale();
  return <aside className="contextual-analysis"><StageAnalysisCard product={product} source={source} locale={locale ?? inheritedLocale} /></aside>;
}
