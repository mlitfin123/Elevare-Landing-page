"use client";

import { useEffect, useRef } from "react";
import { TrackedLink } from "@/components/TrackedLink";
import { trackEvent } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/config";
import type { QuickAnalysisSource } from "@/lib/quick-analysis-attribution";
import { analysisDiscoveryCopy, getCompleteStageSavingsCents, getStageAnalysisEntryHref } from "@/lib/stage-analysis-discovery";
import { formatStageAnalysisPrice, type StageAnalysisProduct } from "@/lib/stage-analysis";

export function StageAnalysisCard({ product, locale = "en", source }: {
  product: StageAnalysisProduct; locale?: Locale; source: QuickAnalysisSource;
}) {
  const target = useRef<HTMLElement>(null);
  const viewed = useRef(false);
  useEffect(() => {
    const element = target.current;
    if (!element || viewed.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || viewed.current) return;
      viewed.current = true;
      trackEvent("stage_analysis_product_view", { analysis_product: product, source });
      observer.disconnect();
    }, { threshold: 0.35 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [product, source]);
  const messages = analysisDiscoveryCopy[locale] ?? analysisDiscoveryCopy.en;
  const item = messages.products[product];
  const bundle = product === "complete_stage_analysis";
  const savings = getCompleteStageSavingsCents();
  return (
    <article ref={target} className={`panel stage-analysis-product-card${bundle ? " analysis-bundle" : ""}`} data-analysis-product={product}>
      <span className="analysis-input">{item.input}</span>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      {bundle ? <span className="analysis-bundle-label">{messages.bundle}</span> : null}
      <div className="analysis-card-bottom">
        <p className="analysis-price"><strong>{formatStageAnalysisPrice(product)}</strong> <span>{messages.oneTime}</span></p>
        {bundle && savings > 0 ? <p className="analysis-savings">{messages.savings.replace("{price}", `$${(savings / 100).toFixed(2)} USD`)}</p> : null}
        <TrackedLink className="button button-secondary" href={getStageAnalysisEntryHref(product, source, locale)} eventName="stage_analysis_product_selected" eventParams={{ analysis_product: product, source }}>
          {messages.action}<span className="sr-only">: {item.title}</span><span aria-hidden="true">↗</span>
        </TrackedLink>
      </div>
    </article>
  );
}
